using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace DocOS.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddB13_ClinicSubscription_ContractSnapshot : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_ClinicSubscriptions_SubscriptionPlans_PlanId",
                table: "ClinicSubscriptions");

            migrationBuilder.RenameColumn(
                name: "PlanId",
                table: "ClinicSubscriptions",
                newName: "CatalogPlanId");

            migrationBuilder.RenameIndex(
                name: "IX_ClinicSubscriptions_PlanId",
                table: "ClinicSubscriptions",
                newName: "IX_ClinicSubscriptions_CatalogPlanId");

            migrationBuilder.AddColumn<DateTime>(
                name: "PlanAssignedAt",
                table: "ClinicSubscriptions",
                type: "datetime2",
                nullable: false,
                defaultValue: new DateTime(1, 1, 1, 0, 0, 0, 0, DateTimeKind.Unspecified));

            migrationBuilder.AddColumn<string>(
                name: "SubscribedBillingCycle",
                table: "ClinicSubscriptions",
                type: "nvarchar(20)",
                maxLength: 20,
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<int>(
                name: "SubscribedDefaultMonthlyVisits",
                table: "ClinicSubscriptions",
                type: "int",
                nullable: true);

            migrationBuilder.AddColumn<bool>(
                name: "SubscribedHasCustomVitals",
                table: "ClinicSubscriptions",
                type: "bit",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<bool>(
                name: "SubscribedHasLabModule",
                table: "ClinicSubscriptions",
                type: "bit",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<bool>(
                name: "SubscribedIsUnlimitedVisits",
                table: "ClinicSubscriptions",
                type: "bit",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<int>(
                name: "SubscribedMaxDoctors",
                table: "ClinicSubscriptions",
                type: "int",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.AddColumn<int>(
                name: "SubscribedMaxStaff",
                table: "ClinicSubscriptions",
                type: "int",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.AddColumn<string>(
                name: "SubscribedPlanName",
                table: "ClinicSubscriptions",
                type: "nvarchar(150)",
                maxLength: 150,
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<decimal>(
                name: "SubscribedPriceINR",
                table: "ClinicSubscriptions",
                type: "decimal(10,2)",
                precision: 10,
                scale: 2,
                nullable: false,
                defaultValue: 0m);

            migrationBuilder.AddColumn<string>(
                name: "SubscribedTier",
                table: "ClinicSubscriptions",
                type: "nvarchar(30)",
                maxLength: 30,
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddForeignKey(
                name: "FK_ClinicSubscriptions_SubscriptionPlans_CatalogPlanId",
                table: "ClinicSubscriptions",
                column: "CatalogPlanId",
                principalTable: "SubscriptionPlans",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);

            migrationBuilder.Sql(@"
                UPDATE cs
                SET 
                    cs.SubscribedPlanName = sp.PlanName,
                    cs.SubscribedTier = sp.Tier,
                    cs.SubscribedBillingCycle = sp.BillingCycle,
                    cs.SubscribedPriceINR = sp.PriceINR,
                    cs.SubscribedIsUnlimitedVisits = sp.IsUnlimitedVisits,
                    cs.SubscribedDefaultMonthlyVisits = sp.DefaultMonthlyVisits,
                    cs.SubscribedMaxDoctors = sp.MaxDoctors,
                    cs.SubscribedMaxStaff = sp.MaxStaff,
                    cs.SubscribedHasCustomVitals = sp.HasCustomVitals,
                    cs.SubscribedHasLabModule = sp.HasLabModule,
                    cs.PlanAssignedAt = COALESCE(cs.UpdatedAt, cs.CreatedAt)
                FROM ClinicSubscriptions cs
                INNER JOIN SubscriptionPlans sp ON cs.CatalogPlanId = sp.Id;
            ");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_ClinicSubscriptions_SubscriptionPlans_CatalogPlanId",
                table: "ClinicSubscriptions");

            migrationBuilder.DropColumn(
                name: "PlanAssignedAt",
                table: "ClinicSubscriptions");

            migrationBuilder.DropColumn(
                name: "SubscribedBillingCycle",
                table: "ClinicSubscriptions");

            migrationBuilder.DropColumn(
                name: "SubscribedDefaultMonthlyVisits",
                table: "ClinicSubscriptions");

            migrationBuilder.DropColumn(
                name: "SubscribedHasCustomVitals",
                table: "ClinicSubscriptions");

            migrationBuilder.DropColumn(
                name: "SubscribedHasLabModule",
                table: "ClinicSubscriptions");

            migrationBuilder.DropColumn(
                name: "SubscribedIsUnlimitedVisits",
                table: "ClinicSubscriptions");

            migrationBuilder.DropColumn(
                name: "SubscribedMaxDoctors",
                table: "ClinicSubscriptions");

            migrationBuilder.DropColumn(
                name: "SubscribedMaxStaff",
                table: "ClinicSubscriptions");

            migrationBuilder.DropColumn(
                name: "SubscribedPlanName",
                table: "ClinicSubscriptions");

            migrationBuilder.DropColumn(
                name: "SubscribedPriceINR",
                table: "ClinicSubscriptions");

            migrationBuilder.DropColumn(
                name: "SubscribedTier",
                table: "ClinicSubscriptions");

            migrationBuilder.RenameColumn(
                name: "CatalogPlanId",
                table: "ClinicSubscriptions",
                newName: "PlanId");

            migrationBuilder.RenameIndex(
                name: "IX_ClinicSubscriptions_CatalogPlanId",
                table: "ClinicSubscriptions",
                newName: "IX_ClinicSubscriptions_PlanId");

            migrationBuilder.AddForeignKey(
                name: "FK_ClinicSubscriptions_SubscriptionPlans_PlanId",
                table: "ClinicSubscriptions",
                column: "PlanId",
                principalTable: "SubscriptionPlans",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);
        }
    }
}
