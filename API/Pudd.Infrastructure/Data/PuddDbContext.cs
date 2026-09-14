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

         protected override void OnModelCreating(ModelBuilder modelBuilder)
        {
            base.OnModelCreating(modelBuilder);

            modelBuilder.Entity<User>()
                .HasIndex(user => user.Email)
                .IsUnique();
        }
    }
}