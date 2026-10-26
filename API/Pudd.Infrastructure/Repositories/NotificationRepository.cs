using Microsoft.EntityFrameworkCore;
using Pudd.Application.Contracts;
using Pudd.Application.Interfaces;

namespace Pudd.Infrastructure.Repositories;

public class NotificationRepository(PuddDbContext db) : INotificationRepository
{
    public async Task<IReadOnlyList<NotificationResponse>> GetAllAsync(Guid recipientId) =>
        await db.notifications.AsNoTracking().Where(n => n.RecipientID == recipientId)
            .OrderByDescending(n => n.CreatedAt).ThenByDescending(n => n.ID)
            .Select(n => new NotificationResponse(n.ID, n.ActorID, n.Actor.Name, n.PostID, n.Kind, n.CreatedAt))
            .ToListAsync();

    public async Task DeleteAsync(Guid recipientId, IReadOnlyCollection<Guid> ids)
    {
        var query = db.notifications.Where(n => n.RecipientID == recipientId && ids.Contains(n.ID));
        if (db.Database.IsRelational()) await query.ExecuteDeleteAsync();
        else
        {
            db.notifications.RemoveRange(await query.ToListAsync());
            await db.SaveChangesAsync();
        }
    }
}
