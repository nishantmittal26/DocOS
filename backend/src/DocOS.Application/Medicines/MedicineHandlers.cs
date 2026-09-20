using DocOS.Application.Common.Interfaces;
using DocOS.Domain.Entities;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace DocOS.Application.Medicines;

public record SearchMedicinesQuery(string Query) : IRequest<List<MedicineDto>>;

public record GetCustomMedicinesQuery() : IRequest<List<MedicineDto>>;

public record AddCustomMedicineCommand(AddCustomMedicineRequest Request) : IRequest<MedicineDto>;

public record UpdateCustomMedicineCommand(Guid Id, UpdateCustomMedicineRequest Request) : IRequest<MedicineDto>;

public record DeleteCustomMedicineCommand(Guid Id) : IRequest<bool>;

public class MedicineHandlers :
    IRequestHandler<SearchMedicinesQuery, List<MedicineDto>>,
    IRequestHandler<GetCustomMedicinesQuery, List<MedicineDto>>,
    IRequestHandler<AddCustomMedicineCommand, MedicineDto>,
    IRequestHandler<UpdateCustomMedicineCommand, MedicineDto>,
    IRequestHandler<DeleteCustomMedicineCommand, bool>
{
    private readonly IApplicationDbContext _context;
    private readonly ICurrentUserService _currentUser;

    public MedicineHandlers(IApplicationDbContext context, ICurrentUserService currentUser)
    {
        _context = context;
        _currentUser = currentUser;
    }

    public async Task<List<MedicineDto>> Handle(SearchMedicinesQuery request, CancellationToken cancellationToken)
    {
        var clinicId = _currentUser.ClinicId;
        var q = (request.Query ?? string.Empty).Trim().ToLower();

        var queryable = _context.Medicines
            .AsNoTracking()
            .Where(m => m.ClinicId == null || (clinicId != null && m.ClinicId == clinicId));

        if (!string.IsNullOrWhiteSpace(q))
        {
            queryable = queryable.Where(m =>
                m.BrandName.ToLower().Contains(q) ||
                m.SaltComposition.ToLower().Contains(q));
        }

        var results = await queryable
            .OrderBy(m => m.BrandName)
            .Take(40)
            .Select(m => new MedicineDto(
                m.Id,
                m.BrandName,
                m.SaltComposition,
                m.Form,
                m.Strength,
                m.Manufacturer,
                m.IsCustom
            ))
            .ToListAsync(cancellationToken);

        return results;
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
            IsCustom = true
        };

        _context.Medicines.Add(medicine);
        await _context.SaveChangesAsync(cancellationToken);

        return new MedicineDto(
            medicine.Id,
            medicine.BrandName,
            medicine.SaltComposition,
            medicine.Form,
            medicine.Strength,
            medicine.Manufacturer,
            medicine.IsCustom
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

        await _context.SaveChangesAsync(cancellationToken);

        return new MedicineDto(
            medicine.Id,
            medicine.BrandName,
            medicine.SaltComposition,
            medicine.Form,
            medicine.Strength,
            medicine.Manufacturer,
            medicine.IsCustom
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
                m.IsCustom
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
            throw new KeyNotFoundException("Custom medicine not found");
        }

        _context.Medicines.Remove(medicine);
        await _context.SaveChangesAsync(cancellationToken);

        return true;
    }
}
