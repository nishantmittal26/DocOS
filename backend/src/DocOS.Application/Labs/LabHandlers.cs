using DocOS.Application.Common.Interfaces;
using DocOS.Domain.Entities;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace DocOS.Application.Labs;

public record GetClinicLabTestsQuery : IRequest<List<LabTestMasterDto>>;
public record GetGlobalLabTestsQuery : IRequest<List<LabTestMasterDto>>;
public record CreateClinicLabTestCommand(CreateLabTestRequest Request) : IRequest<LabTestMasterDto>;
public record UpdateClinicLabTestCommand(Guid Id, UpdateLabTestRequest Request) : IRequest<LabTestMasterDto>;
public record CreateGlobalLabTestCommand(CreateLabTestRequest Request) : IRequest<LabTestMasterDto>;
public record UpdateGlobalLabTestCommand(Guid Id, UpdateLabTestRequest Request) : IRequest<LabTestMasterDto>;

public record GetClinicLabPanelsQuery : IRequest<List<LabTestPanelDto>>;
public record CreateClinicLabPanelCommand(CreateLabPanelRequest Request) : IRequest<LabTestPanelDto>;
public record UpdateClinicLabPanelCommand(Guid Id, UpdateLabPanelRequest Request) : IRequest<LabTestPanelDto>;
public record DeleteClinicLabPanelCommand(Guid Id) : IRequest<bool>;

public class LabHandlers :
    IRequestHandler<GetClinicLabTestsQuery, List<LabTestMasterDto>>,
    IRequestHandler<GetGlobalLabTestsQuery, List<LabTestMasterDto>>,
    IRequestHandler<CreateClinicLabTestCommand, LabTestMasterDto>,
    IRequestHandler<UpdateClinicLabTestCommand, LabTestMasterDto>,
    IRequestHandler<CreateGlobalLabTestCommand, LabTestMasterDto>,
    IRequestHandler<UpdateGlobalLabTestCommand, LabTestMasterDto>,
    IRequestHandler<GetClinicLabPanelsQuery, List<LabTestPanelDto>>,
    IRequestHandler<CreateClinicLabPanelCommand, LabTestPanelDto>,
    IRequestHandler<UpdateClinicLabPanelCommand, LabTestPanelDto>,
    IRequestHandler<DeleteClinicLabPanelCommand, bool>
{
    private readonly IApplicationDbContext _context;
    private readonly ICurrentUserService _currentUser;
    private readonly IAuditService _auditService;

    public LabHandlers(
        IApplicationDbContext context,
        ICurrentUserService currentUser,
        IAuditService auditService)
    {
        _context = context;
        _currentUser = currentUser;
        _auditService = auditService;
    }

    private async Task EnsureLabModuleEntitlementAsync(Guid clinicId, CancellationToken cancellationToken)
    {
        var subscription = await _context.ClinicSubscriptions
            .Include(s => s.Plan)
            .FirstOrDefaultAsync(s => s.ClinicId == clinicId, cancellationToken);

        if (subscription?.Plan?.HasLabModule != true)
        {
            throw new InvalidOperationException("The Lab Module is not included in your clinic's current subscription plan. Please upgrade to access lab tests and panels.");
        }
    }

    public async Task<List<LabTestMasterDto>> Handle(GetClinicLabTestsQuery request, CancellationToken cancellationToken)
    {
        var clinicId = _currentUser.ClinicId
            ?? throw new UnauthorizedAccessException("Clinic context is required");

        await EnsureLabModuleEntitlementAsync(clinicId, cancellationToken);

        var tests = await _context.LabTestMasters
            .Where(t => t.IsActive && (t.ClinicId == null || t.ClinicId == clinicId))
            .OrderBy(t => t.Category)
            .ThenBy(t => t.TestName)
            .Select(t => new LabTestMasterDto(
                t.Id,
                t.ClinicId,
                t.TestCode,
                t.TestName,
                t.Category,
                t.SampleType,
                t.FastingRequired,
                t.IsActive,
                t.ClinicId != null
            ))
            .ToListAsync(cancellationToken);

        return tests;
    }

    public async Task<List<LabTestMasterDto>> Handle(GetGlobalLabTestsQuery request, CancellationToken cancellationToken)
    {
        var tests = await _context.LabTestMasters
            .Where(t => t.ClinicId == null)
            .OrderBy(t => t.Category)
            .ThenBy(t => t.TestName)
            .Select(t => new LabTestMasterDto(
                t.Id,
                t.ClinicId,
                t.TestCode,
                t.TestName,
                t.Category,
                t.SampleType,
                t.FastingRequired,
                t.IsActive,
                false
            ))
            .ToListAsync(cancellationToken);

        return tests;
    }

    public async Task<LabTestMasterDto> Handle(CreateClinicLabTestCommand request, CancellationToken cancellationToken)
    {
        var clinicId = _currentUser.ClinicId
            ?? throw new UnauthorizedAccessException("Clinic context is required");

        await EnsureLabModuleEntitlementAsync(clinicId, cancellationToken);

        var code = request.Request.TestCode.Trim().ToUpperInvariant();
        var exists = await _context.LabTestMasters
            .AnyAsync(t => t.ClinicId == clinicId && t.TestCode == code, cancellationToken);

        if (exists)
        {
            throw new InvalidOperationException($"A lab test with code '{code}' already exists in this clinic.");
        }

        var labTest = new LabTestMaster
        {
            ClinicId = clinicId,
            TestCode = code,
            TestName = request.Request.TestName.Trim(),
            Category = request.Request.Category.Trim(),
            SampleType = request.Request.SampleType?.Trim(),
            FastingRequired = request.Request.FastingRequired,
            IsActive = true
        };

        _context.LabTestMasters.Add(labTest);
        await _context.SaveChangesAsync(cancellationToken);

        await _auditService.LogAsync("CREATE", nameof(LabTestMaster), labTest.Id.ToString(), clinicId: clinicId, cancellationToken: cancellationToken);

        return new LabTestMasterDto(
            labTest.Id,
            labTest.ClinicId,
            labTest.TestCode,
            labTest.TestName,
            labTest.Category,
            labTest.SampleType,
            labTest.FastingRequired,
            labTest.IsActive,
            true
        );
    }

    public async Task<LabTestMasterDto> Handle(UpdateClinicLabTestCommand request, CancellationToken cancellationToken)
    {
        var clinicId = _currentUser.ClinicId
            ?? throw new UnauthorizedAccessException("Clinic context is required");

        await EnsureLabModuleEntitlementAsync(clinicId, cancellationToken);

        var labTest = await _context.LabTestMasters
            .FirstOrDefaultAsync(t => t.Id == request.Id && t.ClinicId == clinicId, cancellationToken)
            ?? throw new KeyNotFoundException("Lab test not found or not owned by clinic.");

        var code = request.Request.TestCode.Trim().ToUpperInvariant();
        var exists = await _context.LabTestMasters
            .AnyAsync(t => t.ClinicId == clinicId && t.TestCode == code && t.Id != request.Id, cancellationToken);

        if (exists)
        {
            throw new InvalidOperationException($"Another lab test with code '{code}' already exists in this clinic.");
        }

        labTest.TestCode = code;
        labTest.TestName = request.Request.TestName.Trim();
        labTest.Category = request.Request.Category.Trim();
        labTest.SampleType = request.Request.SampleType?.Trim();
        labTest.FastingRequired = request.Request.FastingRequired;
        labTest.IsActive = request.Request.IsActive;

        await _context.SaveChangesAsync(cancellationToken);

        await _auditService.LogAsync("UPDATE", nameof(LabTestMaster), labTest.Id.ToString(), clinicId: clinicId, cancellationToken: cancellationToken);

        return new LabTestMasterDto(
            labTest.Id,
            labTest.ClinicId,
            labTest.TestCode,
            labTest.TestName,
            labTest.Category,
            labTest.SampleType,
            labTest.FastingRequired,
            labTest.IsActive,
            true
        );
    }

    public async Task<LabTestMasterDto> Handle(CreateGlobalLabTestCommand request, CancellationToken cancellationToken)
    {
        var code = request.Request.TestCode.Trim().ToUpperInvariant();
        var exists = await _context.LabTestMasters
            .AnyAsync(t => t.ClinicId == null && t.TestCode == code, cancellationToken);

        if (exists)
        {
            throw new InvalidOperationException($"A global lab test with code '{code}' already exists.");
        }

        var labTest = new LabTestMaster
        {
            ClinicId = null,
            TestCode = code,
            TestName = request.Request.TestName.Trim(),
            Category = request.Request.Category.Trim(),
            SampleType = request.Request.SampleType?.Trim(),
            FastingRequired = request.Request.FastingRequired,
            IsActive = true
        };

        _context.LabTestMasters.Add(labTest);
        await _context.SaveChangesAsync(cancellationToken);

        await _auditService.LogAsync("CREATE", nameof(LabTestMaster), labTest.Id.ToString(), clinicId: null, cancellationToken: cancellationToken);

        return new LabTestMasterDto(
            labTest.Id,
            null,
            labTest.TestCode,
            labTest.TestName,
            labTest.Category,
            labTest.SampleType,
            labTest.FastingRequired,
            labTest.IsActive,
            false
        );
    }

    public async Task<LabTestMasterDto> Handle(UpdateGlobalLabTestCommand request, CancellationToken cancellationToken)
    {
        var labTest = await _context.LabTestMasters
            .FirstOrDefaultAsync(t => t.Id == request.Id && t.ClinicId == null, cancellationToken)
            ?? throw new KeyNotFoundException("Global lab test not found.");

        var code = request.Request.TestCode.Trim().ToUpperInvariant();
        var exists = await _context.LabTestMasters
            .AnyAsync(t => t.ClinicId == null && t.TestCode == code && t.Id != request.Id, cancellationToken);

        if (exists)
        {
            throw new InvalidOperationException($"Another global lab test with code '{code}' already exists.");
        }

        labTest.TestCode = code;
        labTest.TestName = request.Request.TestName.Trim();
        labTest.Category = request.Request.Category.Trim();
        labTest.SampleType = request.Request.SampleType?.Trim();
        labTest.FastingRequired = request.Request.FastingRequired;
        labTest.IsActive = request.Request.IsActive;

        await _context.SaveChangesAsync(cancellationToken);

        await _auditService.LogAsync("UPDATE", nameof(LabTestMaster), labTest.Id.ToString(), clinicId: null, cancellationToken: cancellationToken);

        return new LabTestMasterDto(
            labTest.Id,
            null,
            labTest.TestCode,
            labTest.TestName,
            labTest.Category,
            labTest.SampleType,
            labTest.FastingRequired,
            labTest.IsActive,
            false
        );
    }

    public async Task<List<LabTestPanelDto>> Handle(GetClinicLabPanelsQuery request, CancellationToken cancellationToken)
    {
        var clinicId = _currentUser.ClinicId
            ?? throw new UnauthorizedAccessException("Clinic context is required");

        await EnsureLabModuleEntitlementAsync(clinicId, cancellationToken);

        var panels = await _context.LabTestPanels
            .Include(p => p.Items)
                .ThenInclude(i => i.LabTestMaster)
            .Where(p => p.ClinicId == clinicId)
            .OrderBy(p => p.Name)
            .ToListAsync(cancellationToken);

        return panels.Select(p => new LabTestPanelDto(
            p.Id,
            p.ClinicId,
            p.Name,
            p.IsActive,
            p.Items.OrderBy(i => i.DisplayOrder).Select(i => new LabTestMasterDto(
                i.LabTestMaster.Id,
                i.LabTestMaster.ClinicId,
                i.LabTestMaster.TestCode,
                i.LabTestMaster.TestName,
                i.LabTestMaster.Category,
                i.LabTestMaster.SampleType,
                i.LabTestMaster.FastingRequired,
                i.LabTestMaster.IsActive,
                i.LabTestMaster.ClinicId != null
            )).ToList()
        )).ToList();
    }

    public async Task<LabTestPanelDto> Handle(CreateClinicLabPanelCommand request, CancellationToken cancellationToken)
    {
        var clinicId = _currentUser.ClinicId
            ?? throw new UnauthorizedAccessException("Clinic context is required");

        await EnsureLabModuleEntitlementAsync(clinicId, cancellationToken);

        var panel = new LabTestPanel
        {
            ClinicId = clinicId,
            Name = request.Request.Name.Trim(),
            IsActive = true
        };

        int order = 0;
        foreach (var testId in request.Request.TestIds.Distinct())
        {
            panel.Items.Add(new LabTestPanelItem
            {
                LabTestMasterId = testId,
                DisplayOrder = order++
            });
        }

        _context.LabTestPanels.Add(panel);
        await _context.SaveChangesAsync(cancellationToken);

        await _auditService.LogAsync("CREATE", nameof(LabTestPanel), panel.Id.ToString(), clinicId: clinicId, cancellationToken: cancellationToken);

        // Reload with tests
        return await HandleGetPanelDtoAsync(panel.Id, cancellationToken);
    }

    public async Task<LabTestPanelDto> Handle(UpdateClinicLabPanelCommand request, CancellationToken cancellationToken)
    {
        var clinicId = _currentUser.ClinicId
            ?? throw new UnauthorizedAccessException("Clinic context is required");

        await EnsureLabModuleEntitlementAsync(clinicId, cancellationToken);

        var panel = await _context.LabTestPanels
            .Include(p => p.Items)
            .FirstOrDefaultAsync(p => p.Id == request.Id && p.ClinicId == clinicId, cancellationToken)
            ?? throw new KeyNotFoundException("Lab test panel not found.");

        panel.Name = request.Request.Name.Trim();
        panel.IsActive = request.Request.IsActive;

        // Clear existing items and replace
        _context.LabTestPanelItems.RemoveRange(panel.Items);
        int order = 0;
        foreach (var testId in request.Request.TestIds.Distinct())
        {
            panel.Items.Add(new LabTestPanelItem
            {
                LabTestMasterId = testId,
                DisplayOrder = order++
            });
        }

        await _context.SaveChangesAsync(cancellationToken);

        await _auditService.LogAsync("UPDATE", nameof(LabTestPanel), panel.Id.ToString(), clinicId: clinicId, cancellationToken: cancellationToken);

        return await HandleGetPanelDtoAsync(panel.Id, cancellationToken);
    }

    public async Task<bool> Handle(DeleteClinicLabPanelCommand request, CancellationToken cancellationToken)
    {
        var clinicId = _currentUser.ClinicId
            ?? throw new UnauthorizedAccessException("Clinic context is required");

        await EnsureLabModuleEntitlementAsync(clinicId, cancellationToken);

        var panel = await _context.LabTestPanels
            .FirstOrDefaultAsync(p => p.Id == request.Id && p.ClinicId == clinicId, cancellationToken)
            ?? throw new KeyNotFoundException("Lab test panel not found.");

        _context.LabTestPanels.Remove(panel);
        await _context.SaveChangesAsync(cancellationToken);

        await _auditService.LogAsync("DELETE", nameof(LabTestPanel), panel.Id.ToString(), clinicId: clinicId, cancellationToken: cancellationToken);

        return true;
    }

    private async Task<LabTestPanelDto> HandleGetPanelDtoAsync(Guid panelId, CancellationToken cancellationToken)
    {
        var panel = await _context.LabTestPanels
            .Include(p => p.Items)
                .ThenInclude(i => i.LabTestMaster)
            .FirstAsync(p => p.Id == panelId, cancellationToken);

        return new LabTestPanelDto(
            panel.Id,
            panel.ClinicId,
            panel.Name,
            panel.IsActive,
            panel.Items.OrderBy(i => i.DisplayOrder).Select(i => new LabTestMasterDto(
                i.LabTestMaster.Id,
                i.LabTestMaster.ClinicId,
                i.LabTestMaster.TestCode,
                i.LabTestMaster.TestName,
                i.LabTestMaster.Category,
                i.LabTestMaster.SampleType,
                i.LabTestMaster.FastingRequired,
                i.LabTestMaster.IsActive,
                i.LabTestMaster.ClinicId != null
            )).ToList()
        );
    }
}
