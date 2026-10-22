using System.Text;
using System.Text.RegularExpressions;

namespace Pudd.Domain.Entities;

public static partial class ProfileNames
{
    public static string Display(string value) => Whitespace().Replace(value.Normalize(NormalizationForm.FormC).Trim(), " ");
    public static string Key(string value) => Display(value).ToLowerInvariant();

    [GeneratedRegex(@"\s+")]
    private static partial Regex Whitespace();
}
