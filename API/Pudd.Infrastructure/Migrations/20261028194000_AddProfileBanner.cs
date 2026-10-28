using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Pudd.Infrastructure.Migrations;

public partial class AddProfileBanner : Migration
{
    protected override void Up(MigrationBuilder migrationBuilder) =>
        migrationBuilder.AddColumn<string>(name: "BannerImagePath", table: "users", type: "text", nullable: true);

    protected override void Down(MigrationBuilder migrationBuilder) =>
        migrationBuilder.DropColumn(name: "BannerImagePath", table: "users");
}