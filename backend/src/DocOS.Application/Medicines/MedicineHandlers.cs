using DocOS.Application.Common.Interfaces;
using DocOS.Domain.Common;
using DocOS.Domain.Entities;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace DocOS.Application.Medicines;

public record SearchMedicinesQuery(string Query, bool OnlyFavorites = false) : IRequest<List<MedicineDto>>;

public record GetCustomMedicinesQuery() : IRequest<List<MedicineDto>>;

public record AddCustomMedicineCommand(AddCustomMedicineRequest Request) : IRequest<MedicineDto>;

public record UpdateCustomMedicineCommand(Guid Id, UpdateCustomMedicineRequest Request) : IRequest<MedicineDto>;

public record DeleteCustomMedicineCommand(Guid Id) : IRequest<bool>;

public record GetDoctorFavoriteMedicinesQuery() : IRequest<List<MedicineDto>>;

public record ToggleMedicineFavoriteCommand(Guid MedicineId) : IRequest<ToggleMedicineFavoriteResponse>;

public class MedicineHandlers :
    IRequestHandler<SearchMedicinesQuery, List<MedicineDto>>,
    IRequestHandler<GetCustomMedicinesQuery, List<MedicineDto>>,
    IRequestHandler<AddCustomMedicineCommand, MedicineDto>,
    IRequestHandler<UpdateCustomMedicineCommand, MedicineDto>,
    IRequestHandler<DeleteCustomMedicineCommand, bool>,
    IRequestHandler<GetDoctorFavoriteMedicinesQuery, List<MedicineDto>>,
    IRequestHandler<ToggleMedicineFavoriteCommand, ToggleMedicineFavoriteResponse>
{
    private readonly IApplicationDbContext _context;
    private readonly ICurrentUserService _currentUser;
    private readonly IAuditService _auditService;

    public MedicineHandlers(
        IApplicationDbContext context,
        ICurrentUserService currentUser,
        IAuditService auditService)
    {
        _context = context;
        _currentUser = currentUser;
        _auditService = auditService;
    }

    public async Task<List<MedicineDto>> Handle(SearchMedicinesQuery request, CancellationToken cancellationToken)
    {
        var clinicId = _currentUser.ClinicId;
        var userId = _currentUser.UserId;
        var q = (request.Query ?? string.Empty).Trim().ToLower();

        // Get favorites for this user
        var userFavoriteIds = new HashSet<Guid>();
        if (!string.IsNullOrEmpty(userId))
        {
            userFavoriteIds = (await _context.DoctorMedicineFavorites
                .AsNoTracking()
                .Where(f => f.UserId == userId)
                .Select(f => f.MedicineId)
                .ToListAsync(cancellationToken))
                .ToHashSet();
        }

        var queryable = _context.Medicines
            .AsNoTracking()
            .Where(m => m.ClinicId == null || (clinicId != null && m.ClinicId == clinicId));

        if (request.OnlyFavorites && userFavoriteIds.Any())
        {
            queryable = queryable.Where(m => userFavoriteIds.Contains(m.Id));
        }

        if (!string.IsNullOrWhiteSpace(q))
        {
            queryable = queryable.Where(m =>
                m.BrandName.ToLower().Contains(q) ||
                m.SaltComposition.ToLower().Contains(q));
        }

        var rawList = await queryable
            .OrderBy(m => m.BrandName)
            .Take(50)
            .ToListAsync(cancellationToken);

        return rawList.Select(m => new MedicineDto(
            m.Id,
            m.BrandName,
            m.SaltComposition,
            m.Form,
            m.Strength,
            m.Manufacturer,
            m.IsCustom,
            m.DefaultDosage,
            m.DefaultTiming,
            userFavoriteIds.Contains(m.Id)
        )).ToList();
    }

    public async Task<List<MedicineDto>> Handle(GetDoctorFavoriteMedicinesQuery request, CancellationToken cancellationToken)
    {
        var userId = _currentUser.UserId
            ?? throw new UnauthorizedAccessException("User context is required to retrieve favorites");

        var favoriteMedicines = await _context.DoctorMedicineFavorites
            .Include(f => f.Medicine)
            .Where(f => f.UserId == userId)
            .OrderBy(f => f.Medicine.BrandName)
            .Select(f => new MedicineDto(
                f.Medicine.Id,
                f.Medicine.BrandName,
                f.Medicine.SaltComposition,
                f.Medicine.Form,
                f.Medicine.Strength,
                f.Medicine.Manufacturer,
                f.Medicine.IsCustom,
                f.Medicine.DefaultDosage,
                f.Medicine.DefaultTiming,
                true
            ))
            .ToListAsync(cancellationToken);

        return favoriteMedicines;
    }

    public async Task<ToggleMedicineFavoriteResponse> Handle(ToggleMedicineFavoriteCommand request, CancellationToken cancellationToken)
    {
        var userId = _currentUser.UserId
            ?? throw new UnauthorizedAccessException("User context is required to toggle favorites");

        var existing = await _context.DoctorMedicineFavorites
            .FirstOrDefaultAsync(f => f.UserId == userId && f.MedicineId == request.MedicineId, cancellationToken);

        if (existing != null)
        {
            _context.DoctorMedicineFavorites.Remove(existing);
            await _context.SaveChangesAsync(cancellationToken);
            return new ToggleMedicineFavoriteResponse(request.MedicineId, false);
        }
        else
        {
            var fav = new DoctorMedicineFavorite
            {
                UserId = userId,
                MedicineId = request.MedicineId
            };
            _context.DoctorMedicineFavorites.Add(fav);
            await _context.SaveChangesAsync(cancellationToken);
            return new ToggleMedicineFavoriteResponse(request.MedicineId, true);
        }
    }

    public async Task<MedicineDto> Handle(AddCustomMedicineCommand request, CancellationToken cancellationToken)
    {
        var clinicId = _currentUser.ClinicId
            ?? throw new UnauthorizedAccessException("Active clinic context is required to add custom medicines");

        var req = request.Request;
        var medicine = new Medicine
        {
            ClinicId = clinicId,
            BrandName = req.BrandName.Trim(),
            SaltComposition = req.SaltComposition.Trim(),
            Form = req.Form,
            Strength = req.Strength.Trim(),
            Manufacturer = string.IsNullOrWhiteSpace(req.Manufacturer) ? null : req.Manufacturer.Trim(),
            DefaultDosage = string.IsNullOrWhiteSpace(req.DefaultDosage) ? null : req.DefaultDosage.Trim(),
            DefaultTiming = req.DefaultTiming,
            IsCustom = true
        };

        _context.Medicines.Add(medicine);
        await _context.SaveChangesAsync(cancellationToken);

        await _auditService.LogAsync("CREATE", nameof(Medicine), medicine.Id.ToString(), clinicId: clinicId, cancellationToken: cancellationToken);

        return new MedicineDto(
            medicine.Id,
            medicine.BrandName,
            medicine.SaltComposition,
            medicine.Form,
            medicine.Strength,
            medicine.Manufacturer,
            medicine.IsCustom,
            medicine.DefaultDosage,
            medicine.DefaultTiming,
            false
        );
    }

    public async Task<MedicineDto> Handle(UpdateCustomMedicineCommand request, CancellationToken cancellationToken)
    {
        var clinicId = _currentUser.ClinicId
            ?? throw new UnauthorizedAccessException("Active clinic context is required to update custom medicines");

        var medicine = await _context.Medicines
            .FirstOrDefaultAsync(m => m.Id == request.Id && m.ClinicId == clinicId, cancellationToken);

        if (medicine == null)
        {
            throw new KeyNotFoundException("Custom medicine not found or does not belong to this clinic");
        }

        var req = request.Request;
        medicine.BrandName = req.BrandName.Trim();
        medicine.SaltComposition = req.SaltComposition.Trim();
        medicine.Form = req.Form;
        medicine.Strength = req.Strength.Trim();
        medicine.Manufacturer = string.IsNullOrWhiteSpace(req.Manufacturer) ? null : req.Manufacturer.Trim();
        medicine.DefaultDosage = string.IsNullOrWhiteSpace(req.DefaultDosage) ? null : req.DefaultDosage.Trim();
        medicine.DefaultTiming = req.DefaultTiming;
        medicine.UpdatedAt = IndiaTime.Now;

        await _context.SaveChangesAsync(cancellationToken);

        await _auditService.LogAsync("UPDATE", nameof(Medicine), medicine.Id.ToString(), clinicId: clinicId, cancellationToken: cancellationToken);

        return new MedicineDto(
            medicine.Id,
            medicine.BrandName,
            medicine.SaltComposition,
            medicine.Form,
            medicine.Strength,
            medicine.Manufacturer,
            medicine.IsCustom,
            medicine.DefaultDosage,
            medicine.DefaultTiming,
            false
        );
    }

    public async Task<List<MedicineDto>> Handle(GetCustomMedicinesQuery request, CancellationToken cancellationToken)
    {
        var clinicId = _currentUser.ClinicId
            ?? throw new UnauthorizedAccessException("Active clinic context is required");

        var results = await _context.Medicines
            .AsNoTracking()
            .Where(m => m.ClinicId == clinicId)
            .OrderBy(m => m.BrandName)
            .Select(m => new MedicineDto(
                m.Id,
                m.BrandName,
                m.SaltComposition,
                m.Form,
                m.Strength,
                m.Manufacturer,
                m.IsCustom,
                m.DefaultDosage,
                m.DefaultTiming,
                false
            ))
            .ToListAsync(cancellationToken);

        return results;
    }

    public async Task<bool> Handle(DeleteCustomMedicineCommand request, CancellationToken cancellationToken)
    {
        var clinicId = _currentUser.ClinicId
            ?? throw new UnauthorizedAccessException("Active clinic context is required");

        var medicine = await _context.Medicines
            .FirstOrDefaultAsync(m => m.Id == request.Id && m.ClinicId == clinicId, cancellationToken);

        if (medicine == null)
        {
            return true;
        }

        _context.Medicines.Remove(medicine);
        await _context.SaveChangesAsync(cancellationToken);

        await _auditService.LogAsync("DELETE", nameof(Medicine), medicine.Id.ToString(), clinicId: clinicId, cancellationToken: cancellationToken);

        return true;
    }
}
