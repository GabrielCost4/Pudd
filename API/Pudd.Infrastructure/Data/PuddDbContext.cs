using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using Pudd.Domain.Entities;

namespace Pudd.Infrastructure
{
    public class PuddDbContext : DbContext
    {
        public PuddDbContext(DbContextOptions<PuddDbContext> options) : base(options){        
        }

        public DbSet<User> users => Set<User>();
        public DbSet<Post> posts => Set<Post>();
        public DbSet<Comment> comments => Set<Comment>();
        public DbSet<PostLike> postLikes => Set<PostLike>();

        // Define as relações entre as entidades e as regras aplicadas pelo banco nas exclusões.
        protected override void OnModelCreating(ModelBuilder modelBuilder)
        {
            base.OnModelCreating(modelBuilder);

            modelBuilder.Entity<User>()
                .HasIndex(user => user.Email)
                .IsUnique();

            modelBuilder.Entity<Post>()
                .HasOne(post => post.User)
                .WithMany(user => user.Posts)
                .HasForeignKey(post => post.UserID)
                .OnDelete(DeleteBehavior.Restrict);

            modelBuilder.Entity<PostLike>()
                .HasIndex(like => new { like.UserID,
                like.PostID })
                .IsUnique();

            modelBuilder.Entity<Comment>()
                .HasOne(comment => comment.User)
                .WithMany(user => user.Comments)
                .HasForeignKey(comment => comment.UserID)
                .OnDelete(DeleteBehavior.Restrict);

            modelBuilder.Entity<Comment>()
                .HasOne(comment => comment.Post)
                .WithMany(post => post.Comments)
                .HasForeignKey(comment => comment.PostID)
                .OnDelete(DeleteBehavior.Cascade);

            modelBuilder.Entity<PostLike>()
                .HasOne(like => like.User)
                .WithMany(user => user.PostLikes)
                .HasForeignKey(like => like.UserID)
                .OnDelete(DeleteBehavior.Restrict);

            modelBuilder.Entity<PostLike>()
                .HasOne(like => like.Post)
                .WithMany(post => post.Likes)
                .HasForeignKey(like => like.PostID)
                .OnDelete(DeleteBehavior.Cascade);
        }
    }
}
