using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace DocOS.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class VisitDate_Datetime2 : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_Visits_ClinicId_DoctorId_VisitDate_TokenNumber",
                table: "Visits");

            migrationBuilder.AlterColumn<DateTime>(
                name: "VisitDate",
                table: "Visits",
                type: "datetime2",
                nullable: false,
                oldClrType: typeof(DateTime),
                oldType: "date");

            migrationBuilder.AddColumn<DateTime>(
                name: "VisitDay",
                table: "Visits",
                type: "date",
                nullable: false,
                computedColumnSql: "CONVERT(date, [VisitDate])",
                stored: true);

            migrationBuilder.CreateIndex(
                name: "IX_Visits_ClinicId_DoctorId_VisitDay_TokenNumber",
                table: "Visits",
                columns: new[] { "ClinicId", "DoctorId", "VisitDay", "TokenNumber" },
                unique: true,
                filter: "[DoctorId] IS NOT NULL");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_Visits_ClinicId_DoctorId_VisitDay_TokenNumber",
                table: "Visits");

            migrationBuilder.DropColumn(
                name: "VisitDay",
                table: "Visits");

            migrationBuilder.AlterColumn<DateTime>(
                name: "VisitDate",
                table: "Visits",
                type: "date",
                nullable: false,
                oldClrType: typeof(DateTime),
                oldType: "datetime2");

            migrationBuilder.CreateIndex(
                name: "IX_Visits_ClinicId_DoctorId_VisitDate_TokenNumber",
                table: "Visits",
                columns: new[] { "ClinicId", "DoctorId", "VisitDate", "TokenNumber" },
                unique: true,
                filter: "[DoctorId] IS NOT NULL");
        }
    }
}
