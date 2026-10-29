using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Pudd.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddCommunityFeedback : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "feedbacks",
                columns: table => new
                {
                    ID = table.Column<Guid>(type: "uuid", nullable: false),
                    UserID = table.Column<Guid>(type: "uuid", nullable: false),
                    Kind = table.Column<string>(type: "character varying(16)", maxLength: 16, nullable: false),
                    Description = table.Column<string>(type: "character varying(3000)", maxLength: 3000, nullable: false),
                    CreatedAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_feedbacks", x => x.ID);
                    table.ForeignKey(
                        name: "FK_feedbacks_users_UserID",
                        column: x => x.UserID,
                        principalTable: "users",
                        principalColumn: "ID",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateIndex(
                name: "IX_feedbacks_CreatedAt_ID",
                table: "feedbacks",
                columns: new[] { "CreatedAt", "ID" });

            migrationBuilder.CreateIndex(
                name: "IX_feedbacks_UserID",
                table: "feedbacks",
                column: "UserID");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "feedbacks");
        }
    }
}
