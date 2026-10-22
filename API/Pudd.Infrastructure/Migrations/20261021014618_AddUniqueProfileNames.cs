using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Pudd.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddUniqueProfileNames : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "NormalizedName",
                table: "users",
                type: "text",
                nullable: false,
                computedColumnSql: "lower(btrim(regexp_replace(normalize(\"Name\", NFC), '[[:space:]]+', ' ', 'g')))",
                stored: true);

            migrationBuilder.Sql("""
                DO $$
                BEGIN
                    IF EXISTS (SELECT 1 FROM "users" GROUP BY "NormalizedName" HAVING COUNT(*) > 1) THEN
                        RAISE EXCEPTION 'Duplicate profile names prevent migration. No names were changed.'
                            USING HINT = 'Review SELECT "NormalizedName", COUNT(*) FROM "users" GROUP BY "NormalizedName" HAVING COUNT(*) > 1';
                    END IF;
                END $$;
                """);

            migrationBuilder.CreateIndex(
                name: "IX_users_NormalizedName",
                table: "users",
                column: "NormalizedName",
                unique: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_users_NormalizedName",
                table: "users");

            migrationBuilder.DropColumn(
                name: "NormalizedName",
                table: "users");
        }
    }
}
