using System.Text.Json.Serialization;

namespace Pudd.Application.Contracts;

[JsonConverter(typeof(JsonStringEnumConverter<UserPresence>))]
public enum UserPresence
{
    Offline,
    Online
}
