using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace DocOS.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddPhase2D_Features : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_Prescriptions_VisitId",
                table: "Prescriptions");

            migrationBuilder.AddColumn<DateTime>(
                name: "ExpiresAt",
                table: "Prescriptions",
                type: "datetime2",
                nullable: true);

            migrationBuilder.AddColumn<bool>(
                name: "IsCurrent",
                table: "Prescriptions",
                type: "bit",
                nullable: false,
                defaultValue: true);

            migrationBuilder.AddColumn<bool>(
                name: "IsPrinted",
                table: "Prescriptions",
                type: "bit",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<string>(
                name: "PdfShareToken",
                table: "Prescriptions",
                type: "nvarchar(128)",
                maxLength: 128,
                nullable: true);

            migrationBuilder.AddColumn<Guid>(
                name: "PreviousPrescriptionId",
                table: "Prescriptions",
                type: "uniqueidentifier",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "DefaultDosage",
                table: "Medicines",
                type: "nvarchar(50)",
                maxLength: 50,
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "DefaultTiming",
                table: "Medicines",
                type: "int",
                nullable: true);

            migrationBuilder.CreateTable(
                name: "AdviceTemplateMasters",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    ClinicId = table.Column<Guid>(type: "uniqueidentifier", nullable: true),
                    Category = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: false),
                    Title = table.Column<string>(type: "nvarchar(150)", maxLength: 150, nullable: false),
                    InstructionsText = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    IsActive = table.Column<bool>(type: "bit", nullable: false, defaultValue: true),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "datetime2", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_AdviceTemplateMasters", x => x.Id);
                    table.ForeignKey(
                        name: "FK_AdviceTemplateMasters_Clinics_ClinicId",
                        column: x => x.ClinicId,
                        principalTable: "Clinics",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "AuditLogs",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    ClinicId = table.Column<Guid>(type: "uniqueidentifier", nullable: true),
                    UserId = table.Column<string>(type: "nvarchar(450)", maxLength: 450, nullable: true),
                    Action = table.Column<string>(type: "nvarchar(20)", maxLength: 20, nullable: false),
                    EntityName = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: false),
                    EntityId = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: false),
                    Timestamp = table.Column<DateTime>(type: "datetime2", nullable: false),
                    IpAddress = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: true),
                    ChangesJson = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "datetime2", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_AuditLogs", x => x.Id);
                    table.ForeignKey(
                        name: "FK_AuditLogs_AspNetUsers_UserId",
                        column: x => x.UserId,
                        principalTable: "AspNetUsers",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_AuditLogs_Clinics_ClinicId",
                        column: x => x.ClinicId,
                        principalTable: "Clinics",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "DoctorMedicineFavorites",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    UserId = table.Column<string>(type: "nvarchar(450)", maxLength: 450, nullable: false),
                    MedicineId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "datetime2", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_DoctorMedicineFavorites", x => x.Id);
                    table.ForeignKey(
                        name: "FK_DoctorMedicineFavorites_AspNetUsers_UserId",
                        column: x => x.UserId,
                        principalTable: "AspNetUsers",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_DoctorMedicineFavorites_Medicines_MedicineId",
                        column: x => x.MedicineId,
                        principalTable: "Medicines",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "LabTestMasters",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    ClinicId = table.Column<Guid>(type: "uniqueidentifier", nullable: true),
                    TestCode = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: false),
                    TestName = table.Column<string>(type: "nvarchar(150)", maxLength: 150, nullable: false),
                    Category = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: false),
                    SampleType = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: true),
                    FastingRequired = table.Column<bool>(type: "bit", nullable: false, defaultValue: false),
                    IsActive = table.Column<bool>(type: "bit", nullable: false, defaultValue: true),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "datetime2", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_LabTestMasters", x => x.Id);
                    table.ForeignKey(
                        name: "FK_LabTestMasters_Clinics_ClinicId",
                        column: x => x.ClinicId,
                        principalTable: "Clinics",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "LabTestPanels",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    ClinicId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    Name = table.Column<string>(type: "nvarchar(150)", maxLength: 150, nullable: false),
                    IsActive = table.Column<bool>(type: "bit", nullable: false, defaultValue: true),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "datetime2", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_LabTestPanels", x => x.Id);
                    table.ForeignKey(
                        name: "FK_LabTestPanels_Clinics_ClinicId",
                        column: x => x.ClinicId,
                        principalTable: "Clinics",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "VisitPayments",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    VisitId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    ClinicId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    Amount = table.Column<decimal>(type: "decimal(10,2)", precision: 10, scale: 2, nullable: false),
                    Method = table.Column<string>(type: "nvarchar(20)", maxLength: 20, nullable: false),
                    Reference = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: true),
                    CollectedByUserId = table.Column<string>(type: "nvarchar(450)", maxLength: 450, nullable: false),
                    CollectedAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "datetime2", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_VisitPayments", x => x.Id);
                    table.ForeignKey(
                        name: "FK_VisitPayments_AspNetUsers_CollectedByUserId",
                        column: x => x.CollectedByUserId,
                        principalTable: "AspNetUsers",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_VisitPayments_Clinics_ClinicId",
                        column: x => x.ClinicId,
                        principalTable: "Clinics",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_VisitPayments_Visits_VisitId",
                        column: x => x.VisitId,
                        principalTable: "Visits",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "PrescriptionAdvices",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    PrescriptionId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    AdviceTemplateId = table.Column<Guid>(type: "uniqueidentifier", nullable: true),
                    AdviceText = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    DisplayOrder = table.Column<int>(type: "int", nullable: false, defaultValue: 0),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "datetime2", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_PrescriptionAdvices", x => x.Id);
                    table.ForeignKey(
                        name: "FK_PrescriptionAdvices_AdviceTemplateMasters_AdviceTemplateId",
                        column: x => x.AdviceTemplateId,
                        principalTable: "AdviceTemplateMasters",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_PrescriptionAdvices_Prescriptions_PrescriptionId",
                        column: x => x.PrescriptionId,
                        principalTable: "Prescriptions",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "PrescriptionLabOrders",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    PrescriptionId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    LabTestMasterId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    SpecialInstructions = table.Column<string>(type: "nvarchar(300)", maxLength: 300, nullable: true),
                    Status = table.Column<string>(type: "nvarchar(20)", maxLength: 20, nullable: false, defaultValue: "Ordered"),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "datetime2", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_PrescriptionLabOrders", x => x.Id);
                    table.ForeignKey(
                        name: "FK_PrescriptionLabOrders_LabTestMasters_LabTestMasterId",
                        column: x => x.LabTestMasterId,
                        principalTable: "LabTestMasters",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_PrescriptionLabOrders_Prescriptions_PrescriptionId",
                        column: x => x.PrescriptionId,
                        principalTable: "Prescriptions",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "LabTestPanelItems",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    LabTestPanelId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    LabTestMasterId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    DisplayOrder = table.Column<int>(type: "int", nullable: false, defaultValue: 0),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "datetime2", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_LabTestPanelItems", x => x.Id);
                    table.ForeignKey(
                        name: "FK_LabTestPanelItems_LabTestMasters_LabTestMasterId",
                        column: x => x.LabTestMasterId,
                        principalTable: "LabTestMasters",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_LabTestPanelItems_LabTestPanels_LabTestPanelId",
                        column: x => x.LabTestPanelId,
                        principalTable: "LabTestPanels",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_Prescriptions_PdfShareToken",
                table: "Prescriptions",
                column: "PdfShareToken",
                unique: true,
                filter: "[PdfShareToken] IS NOT NULL");

            migrationBuilder.CreateIndex(
                name: "IX_Prescriptions_PreviousPrescriptionId",
                table: "Prescriptions",
                column: "PreviousPrescriptionId");

            migrationBuilder.CreateIndex(
                name: "IX_Prescriptions_VisitId",
                table: "Prescriptions",
                column: "VisitId",
                unique: true,
                filter: "[IsCurrent] = 1");

            migrationBuilder.CreateIndex(
                name: "IX_AdviceTemplateMasters_ClinicId_Category",
                table: "AdviceTemplateMasters",
                columns: new[] { "ClinicId", "Category" });

            migrationBuilder.CreateIndex(
                name: "IX_AuditLogs_ClinicId_Timestamp",
                table: "AuditLogs",
                columns: new[] { "ClinicId", "Timestamp" });

            migrationBuilder.CreateIndex(
                name: "IX_AuditLogs_UserId",
                table: "AuditLogs",
                column: "UserId");

            migrationBuilder.CreateIndex(
                name: "IX_DoctorMedicineFavorites_MedicineId",
                table: "DoctorMedicineFavorites",
                column: "MedicineId");

            migrationBuilder.CreateIndex(
                name: "IX_DoctorMedicineFavorites_UserId_MedicineId",
                table: "DoctorMedicineFavorites",
                columns: new[] { "UserId", "MedicineId" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_LabTestMasters_ClinicId_TestCode",
                table: "LabTestMasters",
                columns: new[] { "ClinicId", "TestCode" },
                unique: true,
                filter: "[ClinicId] IS NOT NULL");

            migrationBuilder.CreateIndex(
                name: "IX_LabTestMasters_TestCode",
                table: "LabTestMasters",
                column: "TestCode",
                unique: true,
                filter: "[ClinicId] IS NULL");

            migrationBuilder.CreateIndex(
                name: "IX_LabTestPanelItems_LabTestMasterId",
                table: "LabTestPanelItems",
                column: "LabTestMasterId");

            migrationBuilder.CreateIndex(
                name: "IX_LabTestPanelItems_LabTestPanelId_LabTestMasterId",
                table: "LabTestPanelItems",
                columns: new[] { "LabTestPanelId", "LabTestMasterId" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_LabTestPanels_ClinicId",
                table: "LabTestPanels",
                column: "ClinicId");

            migrationBuilder.CreateIndex(
                name: "IX_PrescriptionAdvices_AdviceTemplateId",
                table: "PrescriptionAdvices",
                column: "AdviceTemplateId");

            migrationBuilder.CreateIndex(
                name: "IX_PrescriptionAdvices_PrescriptionId",
                table: "PrescriptionAdvices",
                column: "PrescriptionId");

            migrationBuilder.CreateIndex(
                name: "IX_PrescriptionLabOrders_LabTestMasterId",
                table: "PrescriptionLabOrders",
                column: "LabTestMasterId");

            migrationBuilder.CreateIndex(
                name: "IX_PrescriptionLabOrders_PrescriptionId",
                table: "PrescriptionLabOrders",
                column: "PrescriptionId");

            migrationBuilder.CreateIndex(
                name: "IX_VisitPayments_ClinicId_CollectedAt",
                table: "VisitPayments",
                columns: new[] { "ClinicId", "CollectedAt" });

            migrationBuilder.CreateIndex(
                name: "IX_VisitPayments_CollectedByUserId",
                table: "VisitPayments",
                column: "CollectedByUserId");

            migrationBuilder.CreateIndex(
                name: "IX_VisitPayments_VisitId",
                table: "VisitPayments",
                column: "VisitId",
                unique: true);

            migrationBuilder.AddForeignKey(
                name: "FK_Prescriptions_Prescriptions_PreviousPrescriptionId",
                table: "Prescriptions",
                column: "PreviousPrescriptionId",
                principalTable: "Prescriptions",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);

            // Seed Global Lab Tests
            migrationBuilder.InsertData(
                table: "LabTestMasters",
                columns: new[] { "Id", "ClinicId", "TestCode", "TestName", "Category", "SampleType", "FastingRequired", "IsActive", "CreatedAt" },
                values: new object[,]
                {
                    { new Guid("22222222-2222-2222-2222-222222220001"), null, "CBC", "Complete Blood Count", "Hematology", "Blood (EDTA)", false, true, DateTime.UtcNow },
                    { new Guid("22222222-2222-2222-2222-222222220002"), null, "LIPID", "Lipid Profile", "Biochemistry", "Serum", true, true, DateTime.UtcNow },
                    { new Guid("22222222-2222-2222-2222-222222220003"), null, "LFT", "Liver Function Test", "Biochemistry", "Serum", false, true, DateTime.UtcNow },
                    { new Guid("22222222-2222-2222-2222-222222220004"), null, "KFT", "Kidney Function Test", "Biochemistry", "Serum", false, true, DateTime.UtcNow },
                    { new Guid("22222222-2222-2222-2222-222222220005"), null, "HBA1C", "Glycated Hemoglobin (HbA1c)", "Biochemistry", "Blood (EDTA)", false, true, DateTime.UtcNow },
                    { new Guid("22222222-2222-2222-2222-222222220006"), null, "THYROID", "Thyroid Profile (Total T3, Total T4, TSH)", "Biochemistry", "Serum", true, true, DateTime.UtcNow },
                    { new Guid("22222222-2222-2222-2222-222222220007"), null, "URINE_RE", "Urine Routine & Microscopic Examination", "Pathology", "Urine", false, true, DateTime.UtcNow },
                    { new Guid("22222222-2222-2222-2222-222222220008"), null, "FBS", "Fasting Blood Sugar", "Biochemistry", "Blood (Fluoride)", true, true, DateTime.UtcNow },
                    { new Guid("22222222-2222-2222-2222-222222220009"), null, "PPBS", "Post Prandial Blood Sugar", "Biochemistry", "Blood (Fluoride)", false, true, DateTime.UtcNow },
                    { new Guid("22222222-2222-2222-2222-222222220010"), null, "DENGUE_SERO", "Dengue Duo (NS1 Antigen + IgG/IgM Antibodies)", "Serology", "Serum", false, true, DateTime.UtcNow },
                    { new Guid("22222222-2222-2222-2222-222222220011"), null, "WIDAL", "Widal Agglutination Test (Slide / Tube)", "Serology", "Serum", false, true, DateTime.UtcNow }
                });

            // Seed Global Advice Templates
            migrationBuilder.InsertData(
                table: "AdviceTemplateMasters",
                columns: new[] { "Id", "ClinicId", "Category", "Title", "InstructionsText", "IsActive", "CreatedAt" },
                values: new object[,]
                {
                    { new Guid("33333333-3333-3333-3333-333333330001"), null, "Dietary", "Diabetic Dietary Guidelines", "Limit intake of simple sugars, refined flours, potatoes, and sweetened drinks. Incorporate green vegetables, salads, legumes, and whole grains. Maintain regular meal timings and stay well hydrated.", true, DateTime.UtcNow },
                    { new Guid("33333333-3333-3333-3333-333333330002"), null, "Dietary", "Hypertension & Salt Restriction", "Limit daily table salt intake to less than 5 grams (1 teaspoon) per day. Avoid pickles, papads, salted nuts, processed meats, and packaged snacks. Engage in at least 30 minutes of brisk walking daily.", true, DateTime.UtcNow },
                    { new Guid("33333333-3333-3333-3333-333333330003"), null, "General", "Fever Care & Hydration", "Ensure adequate bed rest. Increase fluid intake with ORS, coconut water, fresh lime water, and light soups. For high fever (> 101°F), perform lukewarm water sponge baths. Do not take self-medication beyond prescribed doses.", true, DateTime.UtcNow },
                    { new Guid("33333333-3333-3333-3333-333333330004"), null, "Medication", "Complete Full Course of Antibiotics", "Take all doses of prescribed antibiotic on schedule and complete the full duration advised by the doctor, even if you feel completely recovered earlier. Early cessation can cause bacterial resistance and recurrence.", true, DateTime.UtcNow },
                    { new Guid("33333333-3333-3333-3333-333333330005"), null, "Lifestyle", "Post-Consultation Precautions & Emergency Signs", "Avoid strenuous physical exertion and heavy lifting for the next 48 hours. If you experience alarming symptoms such as chest tightness, difficulty breathing, persistent vomiting, or loss of consciousness, report to the nearest emergency room immediately.", true, DateTime.UtcNow }
                });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_Prescriptions_Prescriptions_PreviousPrescriptionId",
                table: "Prescriptions");

            migrationBuilder.DropTable(
                name: "AuditLogs");

            migrationBuilder.DropTable(
                name: "DoctorMedicineFavorites");

            migrationBuilder.DropTable(
                name: "LabTestPanelItems");

            migrationBuilder.DropTable(
                name: "PrescriptionAdvices");

            migrationBuilder.DropTable(
                name: "PrescriptionLabOrders");

            migrationBuilder.DropTable(
                name: "VisitPayments");

            migrationBuilder.DropTable(
                name: "LabTestPanels");

            migrationBuilder.DropTable(
                name: "AdviceTemplateMasters");

            migrationBuilder.DropTable(
                name: "LabTestMasters");

            migrationBuilder.DropIndex(
                name: "IX_Prescriptions_PdfShareToken",
                table: "Prescriptions");

            migrationBuilder.DropIndex(
                name: "IX_Prescriptions_PreviousPrescriptionId",
                table: "Prescriptions");

            migrationBuilder.DropIndex(
                name: "IX_Prescriptions_VisitId",
                table: "Prescriptions");

            migrationBuilder.DropColumn(
                name: "ExpiresAt",
                table: "Prescriptions");

            migrationBuilder.DropColumn(
                name: "IsCurrent",
                table: "Prescriptions");

            migrationBuilder.DropColumn(
                name: "IsPrinted",
                table: "Prescriptions");

            migrationBuilder.DropColumn(
                name: "PdfShareToken",
                table: "Prescriptions");

            migrationBuilder.DropColumn(
                name: "PreviousPrescriptionId",
                table: "Prescriptions");

            migrationBuilder.DropColumn(
                name: "DefaultDosage",
                table: "Medicines");

            migrationBuilder.DropColumn(
                name: "DefaultTiming",
                table: "Medicines");

            migrationBuilder.CreateIndex(
                name: "IX_Prescriptions_VisitId",
                table: "Prescriptions",
                column: "VisitId",
                unique: true);
        }
    }
}
