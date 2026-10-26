using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Pudd.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddNotificationsAndProfilePostIndex : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_posts_UserID",
                table: "posts");

            migrationBuilder.CreateTable(
                name: "notifications",
                columns: table => new
                {
                    ID = table.Column<Guid>(type: "uuid", nullable: false),
                    RecipientID = table.Column<Guid>(type: "uuid", nullable: false),
                    ActorID = table.Column<Guid>(type: "uuid", nullable: false),
                    PostID = table.Column<Guid>(type: "uuid", nullable: false),
                    CommentID = table.Column<Guid>(type: "uuid", nullable: true),
                    PostLikeID = table.Column<Guid>(type: "uuid", nullable: true),
                    Kind = table.Column<string>(type: "character varying(16)", maxLength: 16, nullable: false),
                    CreatedAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_notifications", x => x.ID);
                    table.ForeignKey(
                        name: "FK_notifications_comments_CommentID",
                        column: x => x.CommentID,
                        principalTable: "comments",
                        principalColumn: "ID",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_notifications_postLikes_PostLikeID",
                        column: x => x.PostLikeID,
                        principalTable: "postLikes",
                        principalColumn: "ID",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_notifications_posts_PostID",
                        column: x => x.PostID,
                        principalTable: "posts",
                        principalColumn: "ID",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_notifications_users_ActorID",
                        column: x => x.ActorID,
                        principalTable: "users",
                        principalColumn: "ID",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_notifications_users_RecipientID",
                        column: x => x.RecipientID,
                        principalTable: "users",
                        principalColumn: "ID",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateIndex(
                name: "IX_posts_UserID_CreatedAt_ID",
                table: "posts",
                columns: new[] { "UserID", "CreatedAt", "ID" });

            migrationBuilder.CreateIndex(
                name: "IX_notifications_ActorID",
                table: "notifications",
                column: "ActorID");

            migrationBuilder.CreateIndex(
                name: "IX_notifications_CommentID",
                table: "notifications",
                column: "CommentID",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_notifications_PostID",
                table: "notifications",
                column: "PostID");

            migrationBuilder.CreateIndex(
                name: "IX_notifications_PostLikeID",
                table: "notifications",
                column: "PostLikeID",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_notifications_RecipientID_CreatedAt_ID",
                table: "notifications",
                columns: new[] { "RecipientID", "CreatedAt", "ID" });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "notifications");

            migrationBuilder.DropIndex(
                name: "IX_posts_UserID_CreatedAt_ID",
                table: "posts");

            migrationBuilder.CreateIndex(
                name: "IX_posts_UserID",
                table: "posts",
                column: "UserID");
        }
    }
}
