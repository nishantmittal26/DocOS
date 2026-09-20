using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace DocOS.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddSugarToVitals : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql("ALTER TABLE \"Visits\" ADD COLUMN IF NOT EXISTS \"Sugar\" character varying(50);");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql("ALTER TABLE \"Visits\" DROP COLUMN IF EXISTS \"Sugar\";");
        }
    }
}
