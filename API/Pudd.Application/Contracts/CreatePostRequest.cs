using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.Linq;
using System.Threading.Tasks;

namespace Pudd.Application.Contracts
{
    public class CreatePostRequest
    {
        // Autor e caminho da imagem são definidos pela API, nunca pelo cliente.
        [Required, StringLength(5000)]
        public string Content { get; set; } = string.Empty;
    }
}
