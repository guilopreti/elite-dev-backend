# Elite Dev Backend — Plataforma de Eventos e Ingressos

API REST para uma plataforma onde um organizador publica eventos a partir de filmes do catálogo TMDb, o cliente reserva ingressos, paga de forma simulada e recebe ingressos individuais com código para QR code. Cada ingresso pode ser compartilhado por link público, e na portaria é validado por código curto — escaneado ou digitado à mão.

## Stack

| Camada | Escolha |
|---|---|
| Linguagem | TypeScript sobre Node.js (type stripping nativo, sem build step) |
| Framework | Express 5 |
| Banco | PostgreSQL |
| ORM | Prisma |
| Autenticação | JWT, três papéis (`organizer`, `customer`, `gate`) |
| Validação | Zod |
| Gerenciador de pacotes | Yarn |

Cada módulo em `src/modules/` segue `controller → service → repository`, com o repositório presente apenas onde há acesso ao banco.

## Requisitos

- **Node.js 22.x ou 24.x** — o projeto executa `.ts` diretamente com `--experimental-strip-types`
- **Yarn** 1.x
- **PostgreSQL** 14 ou superior
- Uma **API key da TMDb** (v3) — [themoviedb.org/settings/api](https://www.themoviedb.org/settings/api)

## Configuração

Copie o arquivo de exemplo e preencha os valores:

```bash
cp .env.example .env
```

| Variável | Descrição |
|---|---|
| `DATABASE_URL` | String de conexão do PostgreSQL |
| `JWT_SECRET` | Segredo dos tokens de autenticação |
| `TICKET_JWT_SECRET` | Segredo dos tokens de ingresso — **mantenha diferente do `JWT_SECRET`** |
| `TMDB_API_KEY` | Chave v3 da TMDb |
| `PORT` | Porta HTTP (padrão `3000`) |
| `NODE_ENV` | `development`, `test` ou `production` |

Os dois segredos são separados de propósito: um token de login não pode servir como token de ingresso, nem o contrário. A aplicação valida todas as variáveis na inicialização e falha imediatamente se alguma estiver ausente.

## Instalação e execução

```bash
yarn install                   # instala dependências e gera o Prisma Client
yarn prisma migrate deploy     # aplica as migrations
yarn seed                      # popula o banco com dados de teste
yarn dev                       # inicia o servidor em http://localhost:3000
```

Todas as rotas ficam sob o prefixo `/api/v1`.

## Dados criados pelo seed

O seed é idempotente — rodar mais de uma vez não duplica nem altera nada.

| Papel | E-mail | Senha |
|---|---|---|
| `organizer` | `organizer@elitedev.test` | `password123` |
| `customer` | `customer1@elitedev.test` | `password123` |
| `customer` | `customer2@elitedev.test` | `password123` |
| `gate` | `gate@elitedev.test` | `password123` |

Também cria **um evento publicado com 50 assentos disponíveis**, com metadados buscados na TMDb — os mesmos dados que o evento teria se fosse criado pela API.

## Pagamento simulado

Não há gateway externo. O resultado do pagamento é decidido por uma função pura sobre o **último dígito do número do cartão**:

| Último dígito | Resultado |
|---|---|
| `0` | **recusado** |
| qualquer outro | **aprovado** |

```bash
4111111111111110   # recusado
4111111111111111   # aprovado
```

A regra é determinística em vez de aleatória por um motivo prático: com uma taxa de recusa randômica, o caminho de pagamento recusado não pode ser demonstrado sob demanda nem testado de forma confiável — o mesmo request produziria resultados diferentes. Sendo função pura do último dígito, ambos os caminhos são reproduzíveis com um único caractere e sem nenhum estado envolvido.

**Aprovado:** dentro de uma única transação, os assentos do evento são decrementados, a reserva passa a `paid`, o pagamento é registrado e os N ingressos são gerados.
**Recusado:** a reserva passa a `declined`, o pagamento é registrado como recusado, nenhum ingresso é gerado e os assentos não são tocados.

## Ingressos e QR code

Cada ingresso tem dois identificadores com finalidades distintas:

- **`code`** — string curta como `TK-K7MNP3QX2R`, gerada com `nanoid` sobre um alfabeto sem caracteres ambíguos (`0`, `O`, `1`, `I` ficam de fora). É o que vai dentro do QR code e o que a portaria valida.
- **`token`** — JWT assinado, usado **apenas** na URL de compartilhamento público.

O back-end **não gera imagem de QR code**. Ele devolve o `code`, e o front-end renderiza o QR a partir dele. O QR não embute o JWT: se embutisse, qualquer foto do ingresso exposta publicamente entregaria um token assinado.

Na portaria, escanear a câmera e digitar o código à mão enviam exatamente o mesmo campo. O código é normalizado (maiúsculas, sem espaços nas pontas) antes da busca, então a digitação manual não falha por diferença de caixa.

## Rotas

Autenticação por header `Authorization: Bearer <token>`.

### Autenticação

| Método | Rota | Acesso |
|---|---|---|
| `POST` | `/api/v1/auth/register` | público |
| `POST` | `/api/v1/auth/login` | público |

```http
POST /api/v1/auth/register
{ "name": "Caio", "email": "caio@test.com", "password": "password123", "role": "customer" }

201 → { "id": "uuid", "name": "Caio", "email": "caio@test.com", "role": "customer" }
409 → e-mail já em uso
422 → erro de validação
```

```http
POST /api/v1/auth/login
{ "email": "customer1@elitedev.test", "password": "password123" }

200 → { "token": "eyJhbGciOi..." }
401 → credenciais inválidas
```

### Catálogo TMDb

| Método | Rota | Acesso |
|---|---|---|
| `GET` | `/api/v1/catalog/search?query=` | `organizer` |

```http
GET /api/v1/catalog/search?query=matrix

200 → { "results": [ { "tmdb_id": 603, "title": "The Matrix",
                       "poster_path": "/dXNAPwY7VrqMAo51EKhhCJfaGb5.jpg",
                       "overview": "..." } ] }
502 → TMDb indisponível
```

Este módulo é proxy puro: nada do que a TMDb devolve aqui é persistido.

### Eventos

| Método | Rota | Acesso |
|---|---|---|
| `POST` | `/api/v1/events` | `organizer` |
| `PATCH` | `/api/v1/events/:id` | `organizer` (dono) |
| `PATCH` | `/api/v1/events/:id/publish` | `organizer` (dono) |
| `DELETE` | `/api/v1/events/:id` | `organizer` (dono) |
| `GET` | `/api/v1/events` | público |
| `GET` | `/api/v1/events/:id` | público |

```http
POST /api/v1/events
{ "tmdb_id": 603, "venue": "Cine Verzel — Sala 1",
  "date": "2026-12-05T20:00:00Z", "price": 45, "capacity": 50 }

201 → { "id": "uuid", "tmdb_id": 603, "title": "The Matrix", "overview": "...",
        "poster_path": "/dXN...jpg", "venue": "Cine Verzel — Sala 1",
        "date": "2026-12-05T20:00:00.000Z", "price": 45, "capacity": 50,
        "available_seats": 50, "status": "draft", "organizer_id": "uuid",
        "created_at": "..." }
404 → tmdb_id não existe na TMDb
502 → TMDb indisponível
```

Título, sinopse e pôster são copiados da TMDb no momento da criação e nunca mais consultados. O evento nasce como `draft`, visível apenas para o organizador que o criou, e `organizer_id` vem sempre do token — enviá-lo no corpo não tem efeito.

```http
PATCH /api/v1/events/:id
{ "venue": "Sala 2", "price": 60 }        # todos os campos opcionais

200 → evento atualizado
403 → não é o dono
409 → evento já publicado (só rascunhos podem ser editados)
```

```http
PATCH /api/v1/events/:id/publish

200 → { ...evento, "status": "published" }
409 → já publicado
```

```http
DELETE /api/v1/events/:id

204 → removido
409 → evento publicado ou com reservas associadas
```

```http
GET /api/v1/events?page=1&limit=20&date=2026-12-05&venue=cine&maxPrice=50

200 → { "data": [ { "id": "uuid", "title": "The Matrix", "poster_path": "/dXN...jpg",
                    "venue": "Cine Verzel — Sala 1", "date": "2026-12-05T20:00:00.000Z",
                    "price": 45, "available_seats": 50 } ],
        "meta": { "total": 1, "page": 1, "limit": 20, "totalPages": 1 } }
```

Retorna apenas eventos `published`. Filtros opcionais e combináveis (todos aplicados em conjunto): `date` (dia exato, UTC), `venue` (trecho do nome, ignorando maiúsculas) e `maxPrice` (preço até o valor). Paginação com `limit` máximo de 100.

```http
GET /api/v1/events/:id

200 → evento completo, incluindo a sinopse
404 → não existe, ou é um rascunho de outro organizador
```

Um rascunho responde 404 para quem não é o dono — em vez de 403 — para não revelar que o evento existe.

### Reservas

| Método | Rota | Acesso |
|---|---|---|
| `POST` | `/api/v1/reservations` | `customer` |

```http
POST /api/v1/reservations
{ "eventId": "uuid", "quantity": 2 }

201 → { "reservationId": "uuid", "totalPrice": 90, "status": "pending" }
404 → evento não existe
409 → evento não publicado, ou assentos insuficientes
```

A reserva registra intenção de compra: ela **não** decrementa os assentos. O decremento acontece só na aprovação do pagamento, então o assento nunca fica preso a uma reserva que nunca será paga. `total_price` é calculado com aritmética decimal, não ponto flutuante.

### Pagamentos

| Método | Rota | Acesso |
|---|---|---|
| `POST` | `/api/v1/payments` | `customer` (dono da reserva) |

```http
POST /api/v1/payments
{ "reservationId": "uuid", "cardNumber": "4111111111111111" }

200 → { "status": "approved",
        "tickets": [ { "id": "uuid", "code": "TK-K7MNP3QX2R", "token": "eyJhbGciOi..." },
                     { "id": "uuid", "code": "TK-P9RSTUVWXY", "token": "eyJhbGciOi..." } ] }

200 → { "status": "declined" }        # cartão terminado em 0
403 → a reserva pertence a outro cliente
409 → reserva não está pendente, já foi paga, ou não há mais assentos
```

Recusa é resultado de negócio, não erro de protocolo — por isso ambos os desfechos respondem 200. Uma reserva de quantidade N gera exatamente N ingressos, cada um com seu próprio código.

### Ingressos

| Método | Rota | Acesso |
|---|---|---|
| `GET` | `/api/v1/tickets?eventId=` | `customer` |
| `GET` | `/api/v1/tickets/share/:token` | público |

```http
GET /api/v1/tickets?eventId=uuid          # eventId é opcional

200 → [ { "id": "uuid", "code": "TK-K7MNP3QX2R", "token": "eyJhbGciOi...",
          "status": "valid",
          "event": { "id": "uuid", "title": "The Matrix",
                     "date": "2026-12-05T20:00:00.000Z",
                     "venue": "Cine Verzel — Sala 1", "poster_path": "/dXN...jpg" } } ]
```

A listagem usa exclusivamente o `userId` do token: não existe parâmetro que permita pedir os ingressos de outro cliente.

```http
GET /api/v1/tickets/share/:token          # sem autenticação

200 → { "eventTitle": "The Matrix", "eventDate": "2026-12-05T20:00:00.000Z",
        "venue": "Cine Verzel — Sala 1", "ticketStatus": "valid",
        "posterPath": "/dXN...jpg" }
401 → token inválido
404 → ingresso não encontrado
```

A resposta é montada campo a campo com apenas o que precisa ser exibido. Nome, e-mail e qualquer outro dado do comprador ficam de fora — o link é público e pode ser repassado a qualquer pessoa.

### Check-in

| Método | Rota | Acesso |
|---|---|---|
| `POST` | `/api/v1/checkin` | `gate` |

```http
POST /api/v1/checkin
{ "code": "TK-K7MNP3QX2R", "eventId": "uuid" }

200 → { "outcome": "valid" }
```

| `outcome` | Significado |
|---|---|
| `valid` | ingresso válido para este evento — marcado como usado nesta requisição |
| `already_used` | o ingresso existe, mas já foi validado antes |
| `event_mismatch` | o ingresso existe, mas pertence a outro evento |
| `not_found` | nenhum ingresso com esse código |

Os quatro desfechos respondem 200: todos são resultados legítimos de uma validação, e o operador da portaria precisa distinguir entre eles, não receber um erro genérico.

## Garantias de concorrência

Dois pontos do sistema não podem falhar sob acesso simultâneo, e ambos resolvem isso com o predicado dentro do próprio `UPDATE`, não com uma leitura seguida de escrita.

**Assentos nunca ficam negativos.** Na aprovação do pagamento:

```sql
UPDATE events SET available_seats = available_seats - :qty
WHERE id = :eventId AND available_seats >= :qty
```

Se dois pagamentos simultâneos disputam os últimos assentos, o PostgreSQL serializa a escrita na linha e reavalia a condição depois de adquirir o lock. Quem chegar depois atualiza zero linhas, e a transação inteira é revertida com 409.

**Um ingresso nunca entra duas vezes.** No check-in, a marcação como usado carrega a mesma guarda:

```sql
UPDATE tickets SET status = 'used' WHERE id = :id AND status = 'valid'
```

Uma leitura prévia do status não resolveria isso: `SELECT` não trava a linha no isolamento padrão do PostgreSQL, então duas requisições simultâneas leriam `valid` e ambas seguiriam adiante. Com o predicado no `UPDATE`, exatamente uma das duas escreve — a outra recebe `already_used`.

## Fluxo completo de teste

Com o servidor rodando e o seed aplicado:

```bash
# 1. login como cliente
CUSTOMER=$(curl -s -X POST localhost:3000/api/v1/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"email":"customer1@elitedev.test","password":"password123"}' | jq -r .token)

# 2. listar eventos publicados e pegar o id do primeiro
EVENT=$(curl -s localhost:3000/api/v1/events | jq -r .data[0].id)

# 3. reservar 2 ingressos
RESERVATION=$(curl -s -X POST localhost:3000/api/v1/reservations \
  -H "Authorization: Bearer $CUSTOMER" -H 'Content-Type: application/json' \
  -d "{\"eventId\":\"$EVENT\",\"quantity\":2}" | jq -r .reservationId)

# 4. pagar (cartão terminado em 1 = aprovado)
curl -s -X POST localhost:3000/api/v1/payments \
  -H "Authorization: Bearer $CUSTOMER" -H 'Content-Type: application/json' \
  -d "{\"reservationId\":\"$RESERVATION\",\"cardNumber\":\"4111111111111111\"}"

# 5. listar os ingressos gerados
curl -s localhost:3000/api/v1/tickets -H "Authorization: Bearer $CUSTOMER"

# 6. validar na portaria (use um code do passo anterior)
GATE=$(curl -s -X POST localhost:3000/api/v1/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"email":"gate@elitedev.test","password":"password123"}' | jq -r .token)

curl -s -X POST localhost:3000/api/v1/checkin \
  -H "Authorization: Bearer $GATE" -H 'Content-Type: application/json' \
  -d "{\"code\":\"TK-XXXXXXXXXX\",\"eventId\":\"$EVENT\"}"
```

Repetir o passo 6 com o mesmo código devolve `already_used`. Trocar o `cardNumber` do passo 4 por um terminado em `0` devolve `declined`, sem gerar ingresso algum.

## Estrutura do projeto

```
src/
  config/          # variáveis de ambiente validadas, cliente Prisma
  middlewares/     # authenticate, authorize, validate, errorHandler
  modules/
    auth/          # registro e login
    users/         # acesso à tabela de usuários
    catalog/       # proxy TMDb — único ponto de contato com a API externa
    events/        # criação, edição, publicação e listagem
    reservations/  # criação de reserva
    payments/      # pagamento simulado e geração de ingressos
    tickets/       # listagem e link compartilhável
    checkin/       # validação na portaria
  routes/          # agregação das rotas
  utils/           # geração de código e assinatura de token de ingresso
  seed/            # script de dados iniciais
prisma/
  schema.prisma
  migrations/
```

## Limitações conhecidas

- **Evento sem pôster.** A coluna `poster_path` não aceita nulo, enquanto a TMDb devolve `poster_path: null` para parte dos filmes. Nesses casos o evento é criado com string vazia, e cabe ao front-end exibir uma imagem de placeholder. A alternativa correta seria tornar a coluna anulável, o que exige uma migration.
