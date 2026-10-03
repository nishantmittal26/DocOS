using DocOS.Application.Common.Interfaces;
using DocOS.Domain.Entities;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace DocOS.Application.Vitals;

public record GetClinicVitalPreferencesQuery : IRequest<List<ClinicVitalPreferenceDto>>;

public record UpdateClinicVitalPreferencesCommand(UpdateClinicVitalPreferencesRequest Request) : IRequest<bool>;

public record CreateCustomVitalCommand(CreateCustomVitalRequest Request) : IRequest<ClinicVitalPreferenceDto>;

public record GetGlobalVitalMastersQuery : IRequest<List<VitalMasterDto>>;

public record CreateGlobalVitalMasterCommand(CreateGlobalVitalMasterRequest Request) : IRequest<VitalMasterDto>;

public record UpdateGlobalVitalMasterCommand(Guid Id, UpdateGlobalVitalMasterRequest Request) : IRequest<VitalMasterDto>;

public record GetVisitVitalsQuery(Guid VisitId) : IRequest<List<VisitVitalItemDto>>;

public record RecordVisitVitalsCommand(Guid VisitId, RecordVisitVitalsRequest Request) : IRequest<Visits.VitalsDto>;

public class VitalHandlers :
    IRequestHandler<GetClinicVitalPreferencesQuery, List<ClinicVitalPreferenceDto>>,
    IRequestHandler<UpdateClinicVitalPreferencesCommand, bool>,
    IRequestHandler<CreateCustomVitalCommand, ClinicVitalPreferenceDto>,
    IRequestHandler<GetGlobalVitalMastersQuery, List<VitalMasterDto>>,
    IRequestHandler<CreateGlobalVitalMasterCommand, VitalMasterDto>,
    IRequestHandler<UpdateGlobalVitalMasterCommand, VitalMasterDto>,
    IRequestHandler<GetVisitVitalsQuery, List<VisitVitalItemDto>>,
    IRequestHandler<RecordVisitVitalsCommand, Visits.VitalsDto>
{
    private readonly IApplicationDbContext _context;
    private readonly ICurrentUserService _currentUser;

    public VitalHandlers(IApplicationDbContext context, ICurrentUserService currentUser)
    {
        _context = context;
        _currentUser = currentUser;
    }

    public async Task<List<ClinicVitalPreferenceDto>> Handle(GetClinicVitalPreferencesQuery request, CancellationToken cancellationToken)
    {
        var clinicId = _currentUser.ClinicId
            ?? throw new UnauthorizedAccessException("Clinic context is required");

        // Load existing preferences for this clinic
        var preferences = await _context.ClinicVitalPreferences
            .Include(p => p.VitalMaster)
            .Where(p => p.ClinicId == clinicId)
            .OrderBy(p => p.DisplayOrder)
            .ToListAsync(cancellationToken);

        // If clinic has no preferences yet, lazily initialize from active global masters
        if (!preferences.Any())
        {
            var globalMasters = await _context.VitalMasters
                .Where(vm => vm.ClinicId == null && vm.IsActive)
                .OrderBy(vm => vm.DefaultDisplayOrder)
                .ToListAsync(cancellationToken);

            int order = 0;
            foreach (var master in globalMasters)
            {
                var pref = new ClinicVitalPreference
                {
                    Id = Guid.NewGuid(),
                    ClinicId = clinicId,
                    VitalMasterId = master.Id,
                    VitalMaster = master,
                    IsEnabled = true,
                    IsMandatory = false,
                    DisplayOrder = master.DefaultDisplayOrder > 0 ? master.DefaultDisplayOrder : order++,
                    CreatedAt = DateTime.UtcNow
                };
                _context.ClinicVitalPreferences.Add(pref);
                preferences.Add(pref);
            }

            if (preferences.Any())
            {
                await _context.SaveChangesAsync(cancellationToken);
            }
        }
        else
        {
            // Check if any new global masters exist that aren't yet in this clinic's preferences
            var existingMasterIds = preferences.Select(p => p.VitalMasterId).ToHashSet();
            var missingGlobalMasters = await _context.VitalMasters
                .Where(vm => vm.ClinicId == null && vm.IsActive && !existingMasterIds.Contains(vm.Id))
                .OrderBy(vm => vm.DefaultDisplayOrder)
                .ToListAsync(cancellationToken);

            if (missingGlobalMasters.Any())
            {
                int maxOrder = preferences.Any() ? preferences.Max(p => p.DisplayOrder) + 1 : 0;
                foreach (var master in missingGlobalMasters)
                {
                    var pref = new ClinicVitalPreference
                    {
                        Id = Guid.NewGuid(),
                        ClinicId = clinicId,
                        VitalMasterId = master.Id,
                        VitalMaster = master,
                        IsEnabled = true,
                        IsMandatory = false,
                        DisplayOrder = master.DefaultDisplayOrder > 0 ? master.DefaultDisplayOrder : maxOrder++,
                        CreatedAt = DateTime.UtcNow
                    };
                    _context.ClinicVitalPreferences.Add(pref);
                    preferences.Add(pref);
                }
                await _context.SaveChangesAsync(cancellationToken);
            }
        }

        return preferences
            .OrderBy(p => p.DisplayOrder)
            .Select(p => new ClinicVitalPreferenceDto(
                p.Id,
                p.VitalMasterId,
                p.VitalMaster.Code,
                p.VitalMaster.DisplayName,
                p.VitalMaster.Unit,
                p.VitalMaster.InputType,
                p.VitalMaster.PairGroup,
                p.VitalMaster.NormalRangeMin,
                p.VitalMaster.NormalRangeMax,
                p.NormalRangeMinOverride,
                p.NormalRangeMaxOverride,
                p.NormalRangeMinOverride ?? p.VitalMaster.NormalRangeMin,
                p.NormalRangeMaxOverride ?? p.VitalMaster.NormalRangeMax,
                p.IsEnabled,
                p.IsMandatory,
                p.DisplayOrder,
                p.VitalMaster.ClinicId != null
            ))
            .ToList();
    }

    public async Task<bool> Handle(UpdateClinicVitalPreferencesCommand request, CancellationToken cancellationToken)
    {
        var clinicId = _currentUser.ClinicId
            ?? throw new UnauthorizedAccessException("Clinic context is required");

        var preferences = await _context.ClinicVitalPreferences
            .Where(p => p.ClinicId == clinicId)
            .ToListAsync(cancellationToken);

        var requestMap = request.Request.Preferences.ToDictionary(p => p.VitalMasterId);

        foreach (var pref in preferences)
        {
            if (requestMap.TryGetValue(pref.VitalMasterId, out var update))
            {
                pref.IsEnabled = update.IsEnabled;
                pref.IsMandatory = update.IsMandatory;
                pref.DisplayOrder = update.DisplayOrder;
                pref.NormalRangeMinOverride = update.NormalRangeMinOverride;
                pref.NormalRangeMaxOverride = update.NormalRangeMaxOverride;
                pref.UpdatedAt = DateTime.UtcNow;
            }
        }

        await _context.SaveChangesAsync(cancellationToken);
        return true;
    }

    public async Task<ClinicVitalPreferenceDto> Handle(CreateCustomVitalCommand request, CancellationToken cancellationToken)
    {
        var clinicId = _currentUser.ClinicId
            ?? throw new UnauthorizedAccessException("Clinic context is required");

        // Entitlement check: HasCustomVitals on the clinic's plan
        var subscription = await _context.ClinicSubscriptions
            .Include(s => s.Plan)
            .FirstOrDefaultAsync(s => s.ClinicId == clinicId, cancellationToken);

        if (subscription?.Plan?.HasCustomVitals != true)
        {
            throw new InvalidOperationException("Custom vitals require a subscription plan that includes the custom vitals feature. Please upgrade your clinic's plan.");
        }

        var req = request.Request;
        var cleanCode = req.Code.Trim().ToUpperInvariant();

        // Check uniqueness for this clinic
        var codeExists = await _context.VitalMasters
            .AnyAsync(vm => (vm.ClinicId == clinicId || vm.ClinicId == null) && vm.Code == cleanCode, cancellationToken);

        if (codeExists)
        {
            throw new InvalidOperationException($"Vital with code '{cleanCode}' already exists.");
        }

        var customMaster = new VitalMaster
        {
            Id = Guid.NewGuid(),
            ClinicId = clinicId,
            Code = cleanCode,
            DisplayName = req.DisplayName.Trim(),
            Unit = req.Unit.Trim(),
            InputType = req.InputType.Trim(),
            PairGroup = string.IsNullOrWhiteSpace(req.PairGroup) ? null : req.PairGroup.Trim(),
            NormalRangeMin = req.NormalRangeMin,
            NormalRangeMax = req.NormalRangeMax,
            DefaultDisplayOrder = req.DisplayOrder,
            IsActive = true,
            CreatedAt = DateTime.UtcNow
        };

        _context.VitalMasters.Add(customMaster);

        // Get max display order for existing preferences
        int nextOrder = req.DisplayOrder > 0 ? req.DisplayOrder :
            (await _context.ClinicVitalPreferences
                .Where(p => p.ClinicId == clinicId)
                .Select(p => (int?)p.DisplayOrder)
                .MaxAsync(cancellationToken) ?? 0) + 1;

        var pref = new ClinicVitalPreference
        {
            Id = Guid.NewGuid(),
            ClinicId = clinicId,
            VitalMasterId = customMaster.Id,
            VitalMaster = customMaster,
            IsEnabled = true,
            IsMandatory = req.IsMandatory,
            DisplayOrder = nextOrder,
            CreatedAt = DateTime.UtcNow
        };

        _context.ClinicVitalPreferences.Add(pref);
        await _context.SaveChangesAsync(cancellationToken);

        return new ClinicVitalPreferenceDto(
            pref.Id,
            customMaster.Id,
            customMaster.Code,
            customMaster.DisplayName,
            customMaster.Unit,
            customMaster.InputType,
            customMaster.PairGroup,
            customMaster.NormalRangeMin,
            customMaster.NormalRangeMax,
            null,
            null,
            customMaster.NormalRangeMin,
            customMaster.NormalRangeMax,
            pref.IsEnabled,
            pref.IsMandatory,
            pref.DisplayOrder,
            true
        );
    }

    public async Task<List<VitalMasterDto>> Handle(GetGlobalVitalMastersQuery request, CancellationToken cancellationToken)
    {
        var masters = await _context.VitalMasters
            .AsNoTracking()
            .Where(vm => vm.ClinicId == null)
            .OrderBy(vm => vm.DefaultDisplayOrder)
            .ToListAsync(cancellationToken);

        return masters.Select(m => new VitalMasterDto(
            m.Id,
            m.ClinicId,
            m.Code,
            m.DisplayName,
            m.Unit,
            m.InputType,
            m.PairGroup,
            m.NormalRangeMin,
            m.NormalRangeMax,
            m.DefaultDisplayOrder,
            m.IsActive,
            false
        )).ToList();
    }

    public async Task<VitalMasterDto> Handle(CreateGlobalVitalMasterCommand request, CancellationToken cancellationToken)
    {
        var req = request.Request;
        var cleanCode = req.Code.Trim().ToUpperInvariant();

        var codeExists = await _context.VitalMasters
            .AnyAsync(vm => vm.ClinicId == null && vm.Code == cleanCode, cancellationToken);

        if (codeExists)
        {
            throw new InvalidOperationException($"Global vital with code '{cleanCode}' already exists.");
        }

        var master = new VitalMaster
        {
            Id = Guid.NewGuid(),
            ClinicId = null,
            Code = cleanCode,
            DisplayName = req.DisplayName.Trim(),
            Unit = req.Unit.Trim(),
            InputType = req.InputType.Trim(),
            PairGroup = string.IsNullOrWhiteSpace(req.PairGroup) ? null : req.PairGroup.Trim(),
            NormalRangeMin = req.NormalRangeMin,
            NormalRangeMax = req.NormalRangeMax,
            DefaultDisplayOrder = req.DefaultDisplayOrder,
            IsActive = true,
            CreatedAt = DateTime.UtcNow
        };

        _context.VitalMasters.Add(master);
        await _context.SaveChangesAsync(cancellationToken);

        return new VitalMasterDto(
            master.Id,
            null,
            master.Code,
            master.DisplayName,
            master.Unit,
            master.InputType,
            master.PairGroup,
            master.NormalRangeMin,
            master.NormalRangeMax,
            master.DefaultDisplayOrder,
            master.IsActive,
            false
        );
    }

    public async Task<VitalMasterDto> Handle(UpdateGlobalVitalMasterCommand request, CancellationToken cancellationToken)
    {
        var master = await _context.VitalMasters
            .FirstOrDefaultAsync(vm => vm.Id == request.Id && vm.ClinicId == null, cancellationToken)
            ?? throw new InvalidOperationException("Global vital master not found.");

        var req = request.Request;
        master.DisplayName = req.DisplayName.Trim();
        master.Unit = req.Unit.Trim();
        master.InputType = req.InputType.Trim();
        master.PairGroup = string.IsNullOrWhiteSpace(req.PairGroup) ? null : req.PairGroup.Trim();
        master.NormalRangeMin = req.NormalRangeMin;
        master.NormalRangeMax = req.NormalRangeMax;
        master.DefaultDisplayOrder = req.DefaultDisplayOrder;
        master.IsActive = req.IsActive;
        master.UpdatedAt = DateTime.UtcNow;

        await _context.SaveChangesAsync(cancellationToken);

        return new VitalMasterDto(
            master.Id,
            null,
            master.Code,
            master.DisplayName,
            master.Unit,
            master.InputType,
            master.PairGroup,
            master.NormalRangeMin,
            master.NormalRangeMax,
            master.DefaultDisplayOrder,
            master.IsActive,
            false
        );
    }

    public async Task<List<VisitVitalItemDto>> Handle(GetVisitVitalsQuery request, CancellationToken cancellationToken)
    {
        var clinicId = _currentUser.ClinicId
            ?? throw new UnauthorizedAccessException("Clinic context is required");

        var vitals = await _context.VisitVitals
            .AsNoTracking()
            .Include(v => v.VitalMaster)
            .Where(v => v.VisitId == request.VisitId && v.Visit.ClinicId == clinicId)
            .OrderBy(v => v.VitalMaster.DefaultDisplayOrder)
            .ToListAsync(cancellationToken);

        return vitals.Select(v => new VisitVitalItemDto(
            v.VitalMasterId,
            v.VitalMaster.Code,
            v.VitalMaster.DisplayName,
            v.ValueText,
            v.ValueNumeric,
            v.UnitSnapshot,
            v.IsAbnormal,
            v.VitalMaster.InputType,
            v.VitalMaster.PairGroup,
            v.RecordedAt
        )).ToList();
    }

    public async Task<Visits.VitalsDto> Handle(RecordVisitVitalsCommand request, CancellationToken cancellationToken)
    {
        var clinicId = _currentUser.ClinicId
            ?? throw new UnauthorizedAccessException("Clinic context is required");

        var visit = await _context.Visits
            .Include(v => v.Vitals)
            .FirstOrDefaultAsync(v => v.Id == request.VisitId && v.ClinicId == clinicId, cancellationToken)
            ?? throw new InvalidOperationException("Visit not found");

        // Load clinic's vital preferences to get effective ranges and mandatory flags
        var preferences = await _context.ClinicVitalPreferences
            .Include(p => p.VitalMaster)
            .Where(p => p.ClinicId == clinicId && p.IsEnabled)
            .ToListAsync(cancellationToken);

        // Map preferences by VitalMasterId and by Code
        var prefById = preferences.ToDictionary(p => p.VitalMasterId);
        var prefByCode = preferences.ToDictionary(p => p.VitalMaster.Code, StringComparer.OrdinalIgnoreCase);

        // Load all active masters accessible to this clinic
        var allMasters = await _context.VitalMasters
            .Where(vm => (vm.ClinicId == clinicId || vm.ClinicId == null) && vm.IsActive)
            .ToListAsync(cancellationToken);

        var masterById = allMasters.ToDictionary(m => m.Id);
        var masterByCode = allMasters.ToDictionary(m => m.Code, StringComparer.OrdinalIgnoreCase);

        // Group incoming items
        var submittedItems = request.Request.Vitals
            .Where(i => !string.IsNullOrWhiteSpace(i.ValueText) || i.ValueNumeric.HasValue)
            .ToList();

        // Check mandatory requirements
        foreach (var pref in preferences.Where(p => p.IsMandatory))
        {
            bool satisfied = submittedItems.Any(i =>
                (i.VitalMasterId.HasValue && i.VitalMasterId.Value == pref.VitalMasterId) ||
                (!string.IsNullOrWhiteSpace(i.Code) && string.Equals(i.Code, pref.VitalMaster.Code, StringComparison.OrdinalIgnoreCase)));

            if (!satisfied)
            {
                throw new InvalidOperationException($"Vital '{pref.VitalMaster.DisplayName}' is mandatory for this clinic.");
            }
        }

        // Automatic BMI Calculation: if WEIGHT and HEIGHT are provided and BMI master exists
        decimal? weightVal = submittedItems.FirstOrDefault(i =>
            (i.VitalMasterId.HasValue && masterById.TryGetValue(i.VitalMasterId.Value, out var m) && m.Code == "WEIGHT") ||
            string.Equals(i.Code, "WEIGHT", StringComparison.OrdinalIgnoreCase))?.ValueNumeric;

        decimal? heightVal = submittedItems.FirstOrDefault(i =>
            (i.VitalMasterId.HasValue && masterById.TryGetValue(i.VitalMasterId.Value, out var m) && m.Code == "HEIGHT") ||
            string.Equals(i.Code, "HEIGHT", StringComparison.OrdinalIgnoreCase))?.ValueNumeric;

        if (weightVal.HasValue && heightVal.HasValue && heightVal.Value > 0)
        {
            var heightInMeters = heightVal.Value / 100m;
            var computedBmi = Math.Round(weightVal.Value / (heightInMeters * heightInMeters), 1);

            // Check if BMI is in submitted items; if not, add or update it
            var bmiItem = submittedItems.FirstOrDefault(i =>
                (i.VitalMasterId.HasValue && masterById.TryGetValue(i.VitalMasterId.Value, out var m) && m.Code == "BMI") ||
                string.Equals(i.Code, "BMI", StringComparison.OrdinalIgnoreCase));

            if (bmiItem != null)
            {
                // Update computed BMI
                var idx = submittedItems.IndexOf(bmiItem);
                submittedItems[idx] = new RecordVisitVitalItemRequest(bmiItem.VitalMasterId, "BMI", computedBmi.ToString("0.0"), computedBmi);
            }
            else if (masterByCode.TryGetValue("BMI", out var bmiMaster))
            {
                submittedItems.Add(new RecordVisitVitalItemRequest(bmiMaster.Id, "BMI", computedBmi.ToString("0.0"), computedBmi));
            }
        }

        var existingVitals = visit.Vitals.ToList();
        var now = DateTime.UtcNow;
        var userId = _currentUser.UserId;

        foreach (var item in submittedItems)
        {
            VitalMaster? master = null;
            if (item.VitalMasterId.HasValue && masterById.TryGetValue(item.VitalMasterId.Value, out var m1))
            {
                master = m1;
            }
            else if (!string.IsNullOrWhiteSpace(item.Code) && masterByCode.TryGetValue(item.Code, out var m2))
            {
                master = m2;
            }

            if (master == null) continue;

            // Resolve effective ranges
            decimal? effectiveMin = master.NormalRangeMin;
            decimal? effectiveMax = master.NormalRangeMax;

            if (prefById.TryGetValue(master.Id, out var clinicPref))
            {
                effectiveMin = clinicPref.NormalRangeMinOverride ?? effectiveMin;
                effectiveMax = clinicPref.NormalRangeMaxOverride ?? effectiveMax;
            }

            // Determine numeric value
            decimal? numericVal = item.ValueNumeric;
            if (!numericVal.HasValue && decimal.TryParse(item.ValueText, out var parsed))
            {
                numericVal = parsed;
            }

            // Abnormality check
            bool isAbnormal = false;
            if (numericVal.HasValue)
            {
                if (effectiveMin.HasValue && numericVal.Value < effectiveMin.Value)
                {
                    isAbnormal = true;
                }
                else if (effectiveMax.HasValue && numericVal.Value > effectiveMax.Value)
                {
                    isAbnormal = true;
                }
            }

            var valueText = !string.IsNullOrWhiteSpace(item.ValueText)
                ? item.ValueText.Trim()
                : (numericVal.HasValue ? numericVal.Value.ToString() : string.Empty);

            var existing = existingVitals.FirstOrDefault(v => v.VitalMasterId == master.Id);
            if (existing != null)
            {
                existing.ValueText = valueText;
                existing.ValueNumeric = numericVal;
                existing.UnitSnapshot = master.Unit;
                existing.IsAbnormal = isAbnormal;
                existing.RecordedAt = now;
                existing.RecordedByUserId = userId;
                existing.UpdatedAt = now;
            }
            else
            {
                var newVital = new VisitVitals
                {
                    Id = Guid.NewGuid(),
                    VisitId = visit.Id,
                    PatientId = visit.PatientId,
                    VitalMasterId = master.Id,
                    VitalMaster = master,
                    ValueText = valueText,
                    ValueNumeric = numericVal,
                    UnitSnapshot = master.Unit,
                    IsAbnormal = isAbnormal,
                    RecordedAt = now,
                    RecordedByUserId = userId,
                    CreatedAt = now
                };
                visit.Vitals.Add(newVital);
                _context.VisitVitals.Add(newVital);
            }
        }

        visit.UpdatedAt = now;
        await _context.SaveChangesAsync(cancellationToken);

        return VitalsMapper.MapToVitalsDto(visit.Vitals) ?? new Visits.VitalsDto();
    }
}
