using DocOS.Application.Common.Interfaces;
using DocOS.Domain.Entities;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace DocOS.Application.Advice;

public record GetClinicAdviceTemplatesQuery(string? Category = null) : IRequest<List<AdviceTemplateDto>>;
public record GetGlobalAdviceTemplatesQuery : IRequest<List<AdviceTemplateDto>>;
public record CreateClinicAdviceTemplateCommand(CreateAdviceTemplateRequest Request) : IRequest<AdviceTemplateDto>;
public record UpdateClinicAdviceTemplateCommand(Guid Id, UpdateAdviceTemplateRequest Request) : IRequest<AdviceTemplateDto>;
public record DeleteClinicAdviceTemplateCommand(Guid Id) : IRequest<bool>;
public record CreateGlobalAdviceTemplateCommand(CreateAdviceTemplateRequest Request) : IRequest<AdviceTemplateDto>;
public record UpdateGlobalAdviceTemplateCommand(Guid Id, UpdateAdviceTemplateRequest Request) : IRequest<AdviceTemplateDto>;

public class AdviceHandlers :
    IRequestHandler<GetClinicAdviceTemplatesQuery, List<AdviceTemplateDto>>,
    IRequestHandler<GetGlobalAdviceTemplatesQuery, List<AdviceTemplateDto>>,
    IRequestHandler<CreateClinicAdviceTemplateCommand, AdviceTemplateDto>,
    IRequestHandler<UpdateClinicAdviceTemplateCommand, AdviceTemplateDto>,
    IRequestHandler<DeleteClinicAdviceTemplateCommand, bool>,
    IRequestHandler<CreateGlobalAdviceTemplateCommand, AdviceTemplateDto>,
    IRequestHandler<UpdateGlobalAdviceTemplateCommand, AdviceTemplateDto>
{
    private readonly IApplicationDbContext _context;
    private readonly ICurrentUserService _currentUser;
    private readonly IAuditService _auditService;

    public AdviceHandlers(
        IApplicationDbContext context,
        ICurrentUserService currentUser,
        IAuditService auditService)
    {
        _context = context;
        _currentUser = currentUser;
        _auditService = auditService;
    }

    public async Task<List<AdviceTemplateDto>> Handle(GetClinicAdviceTemplatesQuery request, CancellationToken cancellationToken)
    {
        var clinicId = _currentUser.ClinicId
            ?? throw new UnauthorizedAccessException("Clinic context is required");

        var query = _context.AdviceTemplateMasters
            .Where(a => a.IsActive && (a.ClinicId == null || a.ClinicId == clinicId));

        if (!string.IsNullOrWhiteSpace(request.Category))
        {
            query = query.Where(a => a.Category == request.Category.Trim());
        }

        var templates = await query
            .OrderBy(a => a.Category)
            .ThenBy(a => a.Title)
            .Select(a => new AdviceTemplateDto(
                a.Id,
                a.ClinicId,
                a.Category,
                a.Title,
                a.InstructionsText,
                a.IsActive,
                a.ClinicId != null
            ))
            .ToListAsync(cancellationToken);

        return templates;
    }

    public async Task<List<AdviceTemplateDto>> Handle(GetGlobalAdviceTemplatesQuery request, CancellationToken cancellationToken)
    {
        var templates = await _context.AdviceTemplateMasters
            .Where(a => a.ClinicId == null)
            .OrderBy(a => a.Category)
            .ThenBy(a => a.Title)
            .Select(a => new AdviceTemplateDto(
                a.Id,
                a.ClinicId,
                a.Category,
                a.Title,
                a.InstructionsText,
                a.IsActive,
                false
            ))
            .ToListAsync(cancellationToken);

        return templates;
    }

    public async Task<AdviceTemplateDto> Handle(CreateClinicAdviceTemplateCommand request, CancellationToken cancellationToken)
    {
        var clinicId = _currentUser.ClinicId
            ?? throw new UnauthorizedAccessException("Clinic context is required");

        var template = new AdviceTemplateMaster
        {
            ClinicId = clinicId,
            Category = request.Request.Category.Trim(),
            Title = request.Request.Title.Trim(),
            InstructionsText = request.Request.InstructionsText.Trim(),
            IsActive = true
        };

        _context.AdviceTemplateMasters.Add(template);
        await _context.SaveChangesAsync(cancellationToken);

        await _auditService.LogAsync("CREATE", nameof(AdviceTemplateMaster), template.Id.ToString(), clinicId: clinicId, cancellationToken: cancellationToken);

        return new AdviceTemplateDto(
            template.Id,
            template.ClinicId,
            template.Category,
            template.Title,
            template.InstructionsText,
            template.IsActive,
            true
        );
    }

    public async Task<AdviceTemplateDto> Handle(UpdateClinicAdviceTemplateCommand request, CancellationToken cancellationToken)
    {
        var clinicId = _currentUser.ClinicId
            ?? throw new UnauthorizedAccessException("Clinic context is required");

        var template = await _context.AdviceTemplateMasters
            .FirstOrDefaultAsync(a => a.Id == request.Id && a.ClinicId == clinicId, cancellationToken)
            ?? throw new KeyNotFoundException("Advice template not found or not owned by clinic.");

        template.Category = request.Request.Category.Trim();
        template.Title = request.Request.Title.Trim();
        template.InstructionsText = request.Request.InstructionsText.Trim();
        template.IsActive = request.Request.IsActive;

        await _context.SaveChangesAsync(cancellationToken);

        await _auditService.LogAsync("UPDATE", nameof(AdviceTemplateMaster), template.Id.ToString(), clinicId: clinicId, cancellationToken: cancellationToken);

        return new AdviceTemplateDto(
            template.Id,
            template.ClinicId,
            template.Category,
            template.Title,
            template.InstructionsText,
            template.IsActive,
            true
        );
    }

    public async Task<bool> Handle(DeleteClinicAdviceTemplateCommand request, CancellationToken cancellationToken)
    {
        var clinicId = _currentUser.ClinicId
            ?? throw new UnauthorizedAccessException("Clinic context is required");

        var template = await _context.AdviceTemplateMasters
            .FirstOrDefaultAsync(a => a.Id == request.Id && a.ClinicId == clinicId, cancellationToken)
            ?? throw new KeyNotFoundException("Advice template not found or not owned by clinic.");

        _context.AdviceTemplateMasters.Remove(template);
        await _context.SaveChangesAsync(cancellationToken);

        await _auditService.LogAsync("DELETE", nameof(AdviceTemplateMaster), template.Id.ToString(), clinicId: clinicId, cancellationToken: cancellationToken);

        return true;
    }

    public async Task<AdviceTemplateDto> Handle(CreateGlobalAdviceTemplateCommand request, CancellationToken cancellationToken)
    {
        var template = new AdviceTemplateMaster
        {
            ClinicId = null,
            Category = request.Request.Category.Trim(),
            Title = request.Request.Title.Trim(),
            InstructionsText = request.Request.InstructionsText.Trim(),
            IsActive = true
        };

        _context.AdviceTemplateMasters.Add(template);
        await _context.SaveChangesAsync(cancellationToken);

        await _auditService.LogAsync("CREATE", nameof(AdviceTemplateMaster), template.Id.ToString(), clinicId: null, cancellationToken: cancellationToken);

        return new AdviceTemplateDto(
            template.Id,
            null,
            template.Category,
            template.Title,
            template.InstructionsText,
            template.IsActive,
            false
        );
    }

    public async Task<AdviceTemplateDto> Handle(UpdateGlobalAdviceTemplateCommand request, CancellationToken cancellationToken)
    {
        var template = await _context.AdviceTemplateMasters
            .FirstOrDefaultAsync(a => a.Id == request.Id && a.ClinicId == null, cancellationToken)
            ?? throw new KeyNotFoundException("Global advice template not found.");

        template.Category = request.Request.Category.Trim();
        template.Title = request.Request.Title.Trim();
        template.InstructionsText = request.Request.InstructionsText.Trim();
        template.IsActive = request.Request.IsActive;

        await _context.SaveChangesAsync(cancellationToken);

        await _auditService.LogAsync("UPDATE", nameof(AdviceTemplateMaster), template.Id.ToString(), clinicId: null, cancellationToken: cancellationToken);

        return new AdviceTemplateDto(
            template.Id,
            null,
            template.Category,
            template.Title,
            template.InstructionsText,
            template.IsActive,
            false
        );
    }
}
