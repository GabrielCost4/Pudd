using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Pudd.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddSocialEntities : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "AvatarImagePath",
                table: "users",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "Bio",
                table: "users",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<bool>(
                name: "IsBlocked",
                table: "users",
                type: "boolean",
                nullable: false,
                defaultValue: false);

            migrationBuilder.CreateTable(
                name: "posts",
                columns: table => new
                {
                    ID = table.Column<Guid>(type: "uuid", nullable: false),
                    Content = table.Column<string>(type: "text", nullable: false),
                    ImagePath = table.Column<string>(type: "text", nullable: true),
                    CreatedAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    UpdatedAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: true),
                    UserID = table.Column<Guid>(type: "uuid", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_posts", x => x.ID);
                    table.ForeignKey(
                        name: "FK_posts_users_UserID",
                        column: x => x.UserID,
                        principalTable: "users",
                        principalColumn: "ID",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "comments",
                columns: table => new
                {
                    ID = table.Column<Guid>(type: "uuid", nullable: false),
                    Content = table.Column<string>(type: "text", nullable: false),
                    CreatedAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    UserID = table.Column<Guid>(type: "uuid", nullable: false),
                    PostID = table.Column<Guid>(type: "uuid", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_comments", x => x.ID);
                    table.ForeignKey(
                        name: "FK_comments_posts_PostID",
                        column: x => x.PostID,
                        principalTable: "posts",
                        principalColumn: "ID",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_comments_users_UserID",
                        column: x => x.UserID,
                        principalTable: "users",
                        principalColumn: "ID",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "postLikes",
                columns: table => new
                {
                    ID = table.Column<Guid>(type: "uuid", nullable: false),
                    CreatedAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    UserID = table.Column<Guid>(type: "uuid", nullable: false),
                    PostID = table.Column<Guid>(type: "uuid", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_postLikes", x => x.ID);
                    table.ForeignKey(
                        name: "FK_postLikes_posts_PostID",
                        column: x => x.PostID,
                        principalTable: "posts",
                        principalColumn: "ID",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_postLikes_users_UserID",
                        column: x => x.UserID,
                        principalTable: "users",
                        principalColumn: "ID",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateIndex(
                name: "IX_comments_PostID",
                table: "comments",
                column: "PostID");

            migrationBuilder.CreateIndex(
                name: "IX_comments_UserID",
                table: "comments",
                column: "UserID");

            migrationBuilder.CreateIndex(
                name: "IX_postLikes_PostID",
                table: "postLikes",
                column: "PostID");

            migrationBuilder.CreateIndex(
                name: "IX_postLikes_UserID_PostID",
                table: "postLikes",
                columns: new[] { "UserID", "PostID" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_posts_UserID",
                table: "posts",
                column: "UserID");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "comments");

            migrationBuilder.DropTable(
                name: "postLikes");

            migrationBuilder.DropTable(
                name: "posts");

            migrationBuilder.DropColumn(
                name: "AvatarImagePath",
                table: "users");

            migrationBuilder.DropColumn(
                name: "Bio",
                table: "users");

            migrationBuilder.DropColumn(
                name: "IsBlocked",
                table: "users");
        }
    }
}
