using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace DocOS.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddPhase2C_DynamicVitals : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            // 1. Create VitalMasters table
            migrationBuilder.CreateTable(
                name: "VitalMasters",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    ClinicId = table.Column<Guid>(type: "uniqueidentifier", nullable: true),
                    Code = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: false),
                    DisplayName = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: false),
                    Unit = table.Column<string>(type: "nvarchar(30)", maxLength: 30, nullable: false),
                    InputType = table.Column<string>(type: "nvarchar(20)", maxLength: 20, nullable: false),
                    PairGroup = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: true),
                    NormalRangeMin = table.Column<decimal>(type: "decimal(12,4)", precision: 12, scale: 4, nullable: true),
                    NormalRangeMax = table.Column<decimal>(type: "decimal(12,4)", precision: 12, scale: 4, nullable: true),
                    DefaultDisplayOrder = table.Column<int>(type: "int", nullable: false, defaultValue: 0),
                    IsActive = table.Column<bool>(type: "bit", nullable: false, defaultValue: true),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "datetime2", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_VitalMasters", x => x.Id);
                    table.ForeignKey(
                        name: "FK_VitalMasters_Clinics_ClinicId",
                        column: x => x.ClinicId,
                        principalTable: "Clinics",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            // 2. Create ClinicVitalPreferences table
            migrationBuilder.CreateTable(
                name: "ClinicVitalPreferences",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    ClinicId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    VitalMasterId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    IsEnabled = table.Column<bool>(type: "bit", nullable: false, defaultValue: true),
                    IsMandatory = table.Column<bool>(type: "bit", nullable: false, defaultValue: false),
                    DisplayOrder = table.Column<int>(type: "int", nullable: false, defaultValue: 0),
                    NormalRangeMinOverride = table.Column<decimal>(type: "decimal(12,4)", precision: 12, scale: 4, nullable: true),
                    NormalRangeMaxOverride = table.Column<decimal>(type: "decimal(12,4)", precision: 12, scale: 4, nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "datetime2", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ClinicVitalPreferences", x => x.Id);
                    table.ForeignKey(
                        name: "FK_ClinicVitalPreferences_Clinics_ClinicId",
                        column: x => x.ClinicId,
                        principalTable: "Clinics",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_ClinicVitalPreferences_VitalMasters_VitalMasterId",
                        column: x => x.VitalMasterId,
                        principalTable: "VitalMasters",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            // 3. Create VisitVitals table
            migrationBuilder.CreateTable(
                name: "VisitVitals",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    VisitId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    PatientId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    VitalMasterId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    ValueText = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: false),
                    ValueNumeric = table.Column<decimal>(type: "decimal(12,4)", precision: 12, scale: 4, nullable: true),
                    UnitSnapshot = table.Column<string>(type: "nvarchar(30)", maxLength: 30, nullable: false),
                    IsAbnormal = table.Column<bool>(type: "bit", nullable: false, defaultValue: false),
                    RecordedAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    RecordedByUserId = table.Column<string>(type: "nvarchar(450)", maxLength: 450, nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "datetime2", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_VisitVitals", x => x.Id);
                    table.ForeignKey(
                        name: "FK_VisitVitals_AspNetUsers_RecordedByUserId",
                        column: x => x.RecordedByUserId,
                        principalTable: "AspNetUsers",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_VisitVitals_Patients_PatientId",
                        column: x => x.PatientId,
                        principalTable: "Patients",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_VisitVitals_Visits_VisitId",
                        column: x => x.VisitId,
                        principalTable: "Visits",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_VisitVitals_VitalMasters_VitalMasterId",
                        column: x => x.VitalMasterId,
                        principalTable: "VitalMasters",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            // 4. Indexes
            migrationBuilder.CreateIndex(
                name: "IX_ClinicVitalPreferences_ClinicId_VitalMasterId",
                table: "ClinicVitalPreferences",
                columns: new[] { "ClinicId", "VitalMasterId" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_ClinicVitalPreferences_VitalMasterId",
                table: "ClinicVitalPreferences",
                column: "VitalMasterId");

            migrationBuilder.CreateIndex(
                name: "IX_VisitVitals_PatientId",
                table: "VisitVitals",
                column: "PatientId");

            migrationBuilder.CreateIndex(
                name: "IX_VisitVitals_RecordedByUserId",
                table: "VisitVitals",
                column: "RecordedByUserId");

            migrationBuilder.CreateIndex(
                name: "IX_VisitVitals_VisitId_VitalMasterId",
                table: "VisitVitals",
                columns: new[] { "VisitId", "VitalMasterId" });

            migrationBuilder.CreateIndex(
                name: "IX_VisitVitals_VitalMasterId",
                table: "VisitVitals",
                column: "VitalMasterId");

            migrationBuilder.CreateIndex(
                name: "IX_VitalMasters_ClinicId_Code",
                table: "VitalMasters",
                columns: new[] { "ClinicId", "Code" },
                unique: true,
                filter: "[ClinicId] IS NOT NULL");

            migrationBuilder.CreateIndex(
                name: "IX_VitalMasters_Code",
                table: "VitalMasters",
                column: "Code",
                unique: true,
                filter: "[ClinicId] IS NULL");

            // 5. Seed Global Vital Masters
            migrationBuilder.InsertData(
                table: "VitalMasters",
                columns: new[] { "Id", "ClinicId", "Code", "DisplayName", "Unit", "InputType", "PairGroup", "NormalRangeMin", "NormalRangeMax", "DefaultDisplayOrder", "IsActive", "CreatedAt" },
                values: new object[,]
                {
                    { new Guid("11111111-1111-1111-1111-111111110001"), null, "BP_SYS", "Systolic BP", "mmHg", "Paired", "BP", 90m, 120m, 1, true, DateTime.UtcNow },
                    { new Guid("11111111-1111-1111-1111-111111110002"), null, "BP_DIA", "Diastolic BP", "mmHg", "Paired", "BP", 60m, 80m, 2, true, DateTime.UtcNow },
                    { new Guid("11111111-1111-1111-1111-111111110003"), null, "PULSE", "Pulse Rate", "bpm", "Number", null, 60m, 100m, 3, true, DateTime.UtcNow },
                    { new Guid("11111111-1111-1111-1111-111111110004"), null, "TEMP_F", "Temperature", "°F", "Decimal", null, 97.0m, 99.0m, 4, true, DateTime.UtcNow },
                    { new Guid("11111111-1111-1111-1111-111111110005"), null, "SPO2", "SpO2", "%", "Number", null, 95m, 100m, 5, true, DateTime.UtcNow },
                    { new Guid("11111111-1111-1111-1111-111111110006"), null, "WEIGHT", "Weight", "kg", "Decimal", null, null, null, 6, true, DateTime.UtcNow },
                    { new Guid("11111111-1111-1111-1111-111111110007"), null, "HEIGHT", "Height", "cm", "Decimal", null, null, null, 7, true, DateTime.UtcNow },
                    { new Guid("11111111-1111-1111-1111-111111110008"), null, "BMI", "BMI", "kg/m²", "Computed", null, 18.5m, 24.9m, 8, true, DateTime.UtcNow },
                    { new Guid("11111111-1111-1111-1111-111111110009"), null, "SUGAR", "Blood Sugar", "mg/dL", "Text", null, null, null, 9, true, DateTime.UtcNow }
                });

            // 6. Seed Clinic Preferences for all existing clinics
            migrationBuilder.Sql(@"
                INSERT INTO [ClinicVitalPreferences] ([Id], [ClinicId], [VitalMasterId], [IsEnabled], [IsMandatory], [DisplayOrder], [CreatedAt])
                SELECT NEWID(), c.[Id], vm.[Id], 1, 0, vm.[DefaultDisplayOrder], GETUTCDATE()
                FROM [Clinics] c
                CROSS JOIN [VitalMasters] vm
                WHERE vm.[ClinicId] IS NULL;
            ");

            // 7. Backfill data from legacy Visit vital columns into VisitVitals before dropping columns
            migrationBuilder.Sql(@"
                -- BP_SYS
                INSERT INTO [VisitVitals] ([Id], [VisitId], [PatientId], [VitalMasterId], [ValueText], [ValueNumeric], [UnitSnapshot], [IsAbnormal], [RecordedAt], [CreatedAt])
                SELECT NEWID(), [Id], [PatientId], '11111111-1111-1111-1111-111111110001', CAST([SystolicBp] AS NVARCHAR(50)), CAST([SystolicBp] AS DECIMAL(12,4)), 'mmHg',
                       CASE WHEN [SystolicBp] < 90 OR [SystolicBp] > 120 THEN 1 ELSE 0 END, [CreatedAt], [CreatedAt]
                FROM [Visits]
                WHERE [SystolicBp] IS NOT NULL;

                -- BP_DIA
                INSERT INTO [VisitVitals] ([Id], [VisitId], [PatientId], [VitalMasterId], [ValueText], [ValueNumeric], [UnitSnapshot], [IsAbnormal], [RecordedAt], [CreatedAt])
                SELECT NEWID(), [Id], [PatientId], '11111111-1111-1111-1111-111111110002', CAST([DiastolicBp] AS NVARCHAR(50)), CAST([DiastolicBp] AS DECIMAL(12,4)), 'mmHg',
                       CASE WHEN [DiastolicBp] < 60 OR [DiastolicBp] > 80 THEN 1 ELSE 0 END, [CreatedAt], [CreatedAt]
                FROM [Visits]
                WHERE [DiastolicBp] IS NOT NULL;

                -- PULSE
                INSERT INTO [VisitVitals] ([Id], [VisitId], [PatientId], [VitalMasterId], [ValueText], [ValueNumeric], [UnitSnapshot], [IsAbnormal], [RecordedAt], [CreatedAt])
                SELECT NEWID(), [Id], [PatientId], '11111111-1111-1111-1111-111111110003', CAST([PulseBpm] AS NVARCHAR(50)), CAST([PulseBpm] AS DECIMAL(12,4)), 'bpm',
                       CASE WHEN [PulseBpm] < 60 OR [PulseBpm] > 100 THEN 1 ELSE 0 END, [CreatedAt], [CreatedAt]
                FROM [Visits]
                WHERE [PulseBpm] IS NOT NULL;

                -- TEMP_F
                INSERT INTO [VisitVitals] ([Id], [VisitId], [PatientId], [VitalMasterId], [ValueText], [ValueNumeric], [UnitSnapshot], [IsAbnormal], [RecordedAt], [CreatedAt])
                SELECT NEWID(), [Id], [PatientId], '11111111-1111-1111-1111-111111110004', CAST([TemperatureF] AS NVARCHAR(50)), [TemperatureF], '°F',
                       CASE WHEN [TemperatureF] < 97.0 OR [TemperatureF] > 99.0 THEN 1 ELSE 0 END, [CreatedAt], [CreatedAt]
                FROM [Visits]
                WHERE [TemperatureF] IS NOT NULL;

                -- SPO2
                INSERT INTO [VisitVitals] ([Id], [VisitId], [PatientId], [VitalMasterId], [ValueText], [ValueNumeric], [UnitSnapshot], [IsAbnormal], [RecordedAt], [CreatedAt])
                SELECT NEWID(), [Id], [PatientId], '11111111-1111-1111-1111-111111110005', CAST([Spo2] AS NVARCHAR(50)), CAST([Spo2] AS DECIMAL(12,4)), '%',
                       CASE WHEN [Spo2] < 95 OR [Spo2] > 100 THEN 1 ELSE 0 END, [CreatedAt], [CreatedAt]
                FROM [Visits]
                WHERE [Spo2] IS NOT NULL;

                -- WEIGHT
                INSERT INTO [VisitVitals] ([Id], [VisitId], [PatientId], [VitalMasterId], [ValueText], [ValueNumeric], [UnitSnapshot], [IsAbnormal], [RecordedAt], [CreatedAt])
                SELECT NEWID(), [Id], [PatientId], '11111111-1111-1111-1111-111111110006', CAST([WeightKg] AS NVARCHAR(50)), [WeightKg], 'kg',
                       0, [CreatedAt], [CreatedAt]
                FROM [Visits]
                WHERE [WeightKg] IS NOT NULL;

                -- HEIGHT
                INSERT INTO [VisitVitals] ([Id], [VisitId], [PatientId], [VitalMasterId], [ValueText], [ValueNumeric], [UnitSnapshot], [IsAbnormal], [RecordedAt], [CreatedAt])
                SELECT NEWID(), [Id], [PatientId], '11111111-1111-1111-1111-111111110007', CAST([HeightCm] AS NVARCHAR(50)), [HeightCm], 'cm',
                       0, [CreatedAt], [CreatedAt]
                FROM [Visits]
                WHERE [HeightCm] IS NOT NULL;

                -- BMI
                INSERT INTO [VisitVitals] ([Id], [VisitId], [PatientId], [VitalMasterId], [ValueText], [ValueNumeric], [UnitSnapshot], [IsAbnormal], [RecordedAt], [CreatedAt])
                SELECT NEWID(), [Id], [PatientId], '11111111-1111-1111-1111-111111110008', CAST([Bmi] AS NVARCHAR(50)), [Bmi], 'kg/m²',
                       CASE WHEN [Bmi] < 18.5 OR [Bmi] > 24.9 THEN 1 ELSE 0 END, [CreatedAt], [CreatedAt]
                FROM [Visits]
                WHERE [Bmi] IS NOT NULL;

                -- SUGAR
                INSERT INTO [VisitVitals] ([Id], [VisitId], [PatientId], [VitalMasterId], [ValueText], [ValueNumeric], [UnitSnapshot], [IsAbnormal], [RecordedAt], [CreatedAt])
                SELECT NEWID(), [Id], [PatientId], '11111111-1111-1111-1111-111111110009', [Sugar], NULL, 'mg/dL',
                       0, [CreatedAt], [CreatedAt]
                FROM [Visits]
                WHERE [Sugar] IS NOT NULL AND LTRIM(RTRIM([Sugar])) <> '';
            ");

            // 8. Now safely drop legacy columns from Visits
            migrationBuilder.DropColumn(
                name: "Bmi",
                table: "Visits");

            migrationBuilder.DropColumn(
                name: "DiastolicBp",
                table: "Visits");

            migrationBuilder.DropColumn(
                name: "HeightCm",
                table: "Visits");

            migrationBuilder.DropColumn(
                name: "PulseBpm",
                table: "Visits");

            migrationBuilder.DropColumn(
                name: "Spo2",
                table: "Visits");

            migrationBuilder.DropColumn(
                name: "Sugar",
                table: "Visits");

            migrationBuilder.DropColumn(
                name: "SystolicBp",
                table: "Visits");

            migrationBuilder.DropColumn(
                name: "TemperatureF",
                table: "Visits");

            migrationBuilder.DropColumn(
                name: "WeightKg",
                table: "Visits");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<decimal>(
                name: "Bmi",
                table: "Visits",
                type: "decimal(12,4)",
                precision: 12,
                scale: 4,
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "DiastolicBp",
                table: "Visits",
                type: "int",
                nullable: true);

            migrationBuilder.AddColumn<decimal>(
                name: "HeightCm",
                table: "Visits",
                type: "decimal(12,4)",
                precision: 12,
                scale: 4,
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "PulseBpm",
                table: "Visits",
                type: "int",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "Spo2",
                table: "Visits",
                type: "int",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "Sugar",
                table: "Visits",
                type: "nvarchar(100)",
                maxLength: 100,
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "SystolicBp",
                table: "Visits",
                type: "int",
                nullable: true);

            migrationBuilder.AddColumn<decimal>(
                name: "TemperatureF",
                table: "Visits",
                type: "decimal(12,4)",
                precision: 12,
                scale: 4,
                nullable: true);

            migrationBuilder.AddColumn<decimal>(
                name: "WeightKg",
                table: "Visits",
                type: "decimal(12,4)",
                precision: 12,
                scale: 4,
                nullable: true);

            migrationBuilder.DropTable(
                name: "ClinicVitalPreferences");

            migrationBuilder.DropTable(
                name: "VisitVitals");

            migrationBuilder.DropTable(
                name: "VitalMasters");
        }
    }
}
