using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace DocOS.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddClinicSubscription_LabModuleOverride : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<bool>(
                name: "LabModuleOverride",
                table: "ClinicSubscriptions",
                type: "bit",
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "LabModuleOverride",
                table: "ClinicSubscriptions");
        }
    }
}
