# Pudd — Postagens

## Modelo de dados

```mermaid
erDiagram
    USER ||--o{ POST : cria
    USER ||--o{ COMMENT : escreve
    POST ||--o{ COMMENT : recebe
    USER ||--o{ POSTLIKE : realiza
    POST ||--o{ POSTLIKE : recebe

    USER {
        uuid ID PK
        string Name
        string Email
        string Bio
        string AvatarImagePath
        boolean IsBlocked
        int Role
    }

    POST {
        uuid ID PK
        string Content
        string ImagePath
        datetimeoffset CreatedAt
        datetimeoffset UpdatedAt
        uuid UserID FK
    }

    COMMENT {
        uuid ID PK
        string Content
        datetimeoffset CreatedAt
        uuid UserID FK
        uuid PostID FK
    }

    POSTLIKE {
        uuid ID PK
        datetimeoffset CreatedAt
        uuid UserID FK
        uuid PostID FK
    }
```

## Regras de relacionamento

```mermaid
flowchart TD
    deletePost[Excluir post] --> deleteComments[Excluir comentários do post]
    deletePost --> deleteLikes[Excluir curtidas do post]
    deleteUser[Tentar excluir usuário] --> hasDependencies{Possui posts, comentários ou curtidas?}
    hasDependencies -- Sim --> restrict[Restrict: banco impede a exclusão]
    hasDependencies -- Não --> deleteUserAllowed[Usuário pode ser excluído]
    like[Usuário curte post] --> unique{Já existe UserID e PostID?}
    unique -- Sim --> noDuplicate[Não cria nova curtida]
    unique -- Não --> createLike[Cria PostLike]
```

- Um usuário pode criar nenhuma ou várias postagens.
- Cada postagem pertence a um único usuário.
- Um comentário pertence a um usuário e a uma postagem.
- A combinação `UserID + PostID` em `PostLike` é única: um usuário só pode curtir uma vez cada post.
- Ao excluir uma postagem, comentários e curtidas vinculados são removidos em cascata.
