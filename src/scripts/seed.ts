import { NestFactory } from '@nestjs/core';
import * as argon2 from 'argon2';
import { DataSource } from 'typeorm';
import { AppModule } from '../app.module';
import { roleForSpeciality, type Speciality } from '../common/domain/directory';
import { PostsService } from '../posts/posts.service';
import { UsersService } from '../users/users.service';

const PASSWORD = 'Password1';

interface SeedPerson {
  firstName: string;
  lastName: string;
  nickname: string;
  email: string;
  speciality: Speciality;
}

interface SeedPost {
  author: string;
  direction: Speciality;
  title: string;
  body: string;
}

const PEOPLE: SeedPerson[] = [
  {
    firstName: 'Ada',
    lastName: 'Byron',
    nickname: 'ada',
    email: 'ada@mainline.dev',
    speciality: 'backend',
  },
  {
    firstName: 'Grace',
    lastName: 'Hopper',
    nickname: 'grace',
    email: 'grace@mainline.dev',
    speciality: 'backend',
  },
  {
    firstName: 'Linus',
    lastName: 'Nord',
    nickname: 'linus',
    email: 'linus@mainline.dev',
    speciality: 'frontend',
  },
  {
    firstName: 'Mira',
    lastName: 'Sato',
    nickname: 'mira',
    email: 'mira@mainline.dev',
    speciality: 'design',
  },
  {
    firstName: 'Omar',
    lastName: 'Haddad',
    nickname: 'omar',
    email: 'omar@mainline.dev',
    speciality: 'qa',
  },
  {
    firstName: 'Vera',
    lastName: 'Ilyina',
    nickname: 'vera',
    email: 'vera@mainline.dev',
    speciality: 'hr',
  },
];

const POSTS: SeedPost[] = [
  {
    author: 'ada',
    direction: 'backend',
    title: 'Keyset pagination beats OFFSET every time',
    body: `Offset pagination looks harmless until the table grows.

\`\`\`sql
select * from posts order by "createdAt" desc offset 10000 limit 20;
\`\`\`

Postgres still has to walk those ten thousand rows before it can throw them away.
Worse, a post inserted while the reader is on page three shifts everything down by
one, so they see the same row twice and never notice the one that slipped past.

Keyset pagination asks a different question: give me the rows that sort after this
one. The cursor is the sort key of the last row you saw.

\`\`\`sql
select * from posts
where ("createdAt", id) < ($1, $2)
order by "createdAt" desc, id desc
limit 20;
\`\`\`

One index on ("createdAt", id) and the database jumps straight to the starting point.
The page size stays constant no matter how deep you scroll, and new rows land above
the cursor where they belong instead of shuffling the ground under the reader.`,
  },
  {
    author: 'grace',
    direction: 'backend',
    title: 'A repository is not an ORM wrapper',
    body: `The point of a repository is not to hide SQL. It is to keep the shape of your
domain from being decided by the driver you happened to install.

We moved from Mongoose to TypeORM in a day. Not a single controller, service or DTO
changed, because none of them had ever seen a document or an entity. What changed was
one folder per module and two lines of provider wiring.

The rule that made it work: the ORM type never crosses the infra boundary. A mapper
turns the row into the domain object at the edge, and the rest of the codebase talks
about posts and users, not about entities.`,
  },
  {
    author: 'linus',
    direction: 'frontend',
    title: 'Sanitize markdown, then render it',
    body: `Rendering user markdown without sanitizing it is how you hand your feed to
whoever types fastest.

\`\`\`tsx
<Markdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeSanitize]}>
  {post.body}
</Markdown>
\`\`\`

The order matters: sanitize runs on the HTML tree, after markdown has been parsed, so
anything smuggled through inline HTML is dropped before it reaches the DOM.

<script>alert('this should never run')</script>

The script tag above is in the source of this post on purpose. If the paragraph below
follows straight after the sentence above it, the sanitizer dropped the tag together with
its contents, which is exactly what it is for.`,
  },
  {
    author: 'mira',
    direction: 'design',
    title: 'Dark themes are not inverted light themes',
    body: `Flip the background and every carefully chosen colour goes wrong at once.
Shadows stop reading as depth, because there is nothing left for them to darken.
Saturated accents that looked confident on white start to buzz. Text that was
comfortable at regular weight turns thin and gritty.

A dark theme wants its own set of decisions: elevation as lighter surfaces rather than
heavier shadows, accents pulled down in saturation and up in lightness, and a body
weight one notch heavier than you would use on white.

Contrast still has to clear 4.5:1. A dim interface is not an excuse for grey on grey.`,
  },
  {
    author: 'omar',
    direction: 'qa',
    title: 'The bug report I want to receive',
    body: `Three lines is enough. What you did, what you expected, what happened instead.

Everything else is decoration until those three exist. Attach the request id if the
screen shows one, say which build you were on, and stop there. A report that spends a
paragraph guessing at the cause usually sends the first hour of debugging in the wrong
direction.`,
  },
  {
    author: 'vera',
    direction: 'hr',
    title: 'What a portfolio actually has to show',
    body: `Not that you can build a todo list. That you can finish something and explain
why it is built the way it is.

Two projects with honest readmes beat nine abandoned repositories. Say what the
constraints were, what you chose, and what you would do differently now. The last part
is the one that gets read twice.`,
  },
  {
    author: 'linus',
    direction: 'frontend',
    title: 'Optimistic updates need a rollback plan',
    body: `Flipping a like counter before the request lands feels instant. It also lies
half a percent of the time, and that half is the part users remember.

Keep the previous value, apply the change, and put it back if the mutation rejects.
TanStack Query hands you the snapshot in onMutate and the failure in onError, so the
whole dance is a dozen lines. Skipping it is not a shortcut, it is a bug with better
latency.`,
  },
  {
    author: 'ada',
    direction: 'backend',
    title: 'Rotate refresh tokens or do not use them',
    body: `A refresh token that survives its own use is a password with a longer name.

Rotation means the old token dies the moment a new one is issued, both inside one
transaction. If a stolen token is replayed after the real client refreshed, it hits a
row that is already spent and the session is over for everyone. That is the point:
the theft becomes visible instead of silent.`,
  },
  {
    author: 'grace',
    direction: 'backend',
    title: 'Migrations, not synchronize',
    body: `Auto-syncing the schema in development teaches you nothing about the change you
are about to make in production.

A migration file is a change somebody read before it ran. It has a down. It sits in the
diff next to the entity it belongs to, which is exactly where a reviewer will look for
it.`,
  },
  {
    author: 'mira',
    direction: 'design',
    title: 'One accent colour is usually enough',
    body: `The second accent always arrives with a good reason and leaves the interface
without a focal point.

If everything is highlighted, the eye picks the largest thing instead of the most
important one. Give the accent to the single action you want taken on the screen and
let structure, spacing and weight carry the rest.`,
  },
  {
    author: 'omar',
    direction: 'qa',
    title: 'Flaky tests are findings, not noise',
    body: `A test that passes nine times out of ten found a race. Retrying it until green
does not fix the race, it just moves the failure to a user.`,
  },
  {
    author: 'linus',
    direction: 'frontend',
    title: 'URL is state you get for free',
    body: `Filters that live in component state disappear on refresh and cannot be sent to
a colleague.

\`\`\`ts
validateSearch: z.object({
  type: z.enum(POST_TYPES).optional(),
  direction: z.enum(SPECIALITIES).optional(),
})
\`\`\`

Put them in the query string and the browser gives you back, forward, refresh and
sharing without a line of extra code.`,
  },
  {
    author: 'vera',
    direction: 'hr',
    title: 'Take-home tasks should cost an evening, not a weekend',
    body: `If the task needs two days, the candidates who already have a job will decline and
you will never know they applied.

Scope it to three hours and read the code, not the feature count.`,
  },
  {
    author: 'grace',
    direction: 'backend',
    title: 'Idempotency is a feature, not a nicety',
    body: `A like that fires twice on a double click, a webhook that is delivered again, a retry
after a timeout the client never saw. All three are the same problem.

\`\`\`sql
insert into likes ("userId", "postId") values ($1, $2)
on conflict do nothing;
\`\`\`

The database already knows how to say "already there". Let it.`,
  },
  {
    author: 'mira',
    direction: 'design',
    title: 'Empty states are the first screen a new user sees',
    body: `And they usually get five minutes of design, at the very end, from whoever is left.

Say what goes here, why it is empty, and what to press. Three lines beat an illustration
of a person looking at a cloud.`,
  },
  {
    author: 'linus',
    direction: 'frontend',
    title: 'Skeletons or spinners',
    body: `A spinner says something is happening. A skeleton says what is about to appear and
where. On a list, the skeleton wins, because the layout stops jumping when the data lands.

Under about three hundred milliseconds, show neither. A flash of loading state reads as a
glitch, not as feedback.`,
  },
  {
    author: 'omar',
    direction: 'qa',
    title: 'Test the boundary, not the middle',
    body: `Nobody types a hundred characters into a field limited to a hundred and one. They type
zero, one, exactly the limit, and one past it.

That is four cases, and they find almost everything an off-by-one can hide.`,
  },
  {
    author: 'ada',
    direction: 'backend',
    title: 'Every list endpoint needs a hard limit',
    body: `Not a default. A maximum.

A default of twenty is polite. A maximum of fifty is what stops one client from asking for
every row in the table on a Monday morning and taking the database with it.

\`\`\`ts
limit: z.coerce.number().int().min(1).max(50).default(20),
\`\`\``,
  },
  {
    author: 'mira',
    direction: 'design',
    title: 'Monospace is a voice, not a decoration',
    body: `Timestamps, counters, ids, keyboard shortcuts. Anything the eye should compare
vertically or copy exactly.

Use it there and the interface reads as a tool. Use it on body text and the interface reads
as a screenshot of a terminal.`,
  },
  {
    author: 'grace',
    direction: 'backend',
    title: 'The error shape is part of the contract',
    body: `If every endpoint invents its own failure payload, every client writes its own parser
and none of them agree.

One shape, one machine readable code, an optional map of field errors. Clients branch on the
code, never on the wording, so the wording stays free to change.`,
  },
  {
    author: 'linus',
    direction: 'frontend',
    title: 'The barrel file that doubled my bundle',
    body: `A route loader imported one query helper from an entity barrel. The barrel also
re-exported a card component, the card pulled in a markdown renderer, and the renderer pulled
in a syntax highlighter.

None of it was used by the loader. All of it landed in the eager chunk, because a bundler
cannot drop a re-export it is not told is side effect free.

The fix was two lines: lazy import the heavy component behind the Suspense boundary it
already had.`,
  },
  {
    author: 'vera',
    direction: 'hr',
    title: 'Say the salary range',
    body: `Both sides already have a number in mind. Naming yours first saves four interviews and
a conversation nobody enjoys.`,
  },
  {
    author: 'omar',
    direction: 'qa',
    title: 'Reproduce before you fix',
    body: `A fix for a bug you never reproduced is a guess with a commit message.

Write the failing case first, even if it is a curl command in the ticket. Then the fix has
something to prove.`,
  },
  {
    author: 'ada',
    direction: 'backend',
    title: 'Transactions are about invariants, not about speed',
    body: `Registering a user creates a person and their first chat. Responding to a vacancy
creates an interaction, a notification for the author and a conversation.

Half of any of those is not a slower result. It is a broken account somebody has to fix by
hand.`,
  },
];

const seed = async () => {
  const context = await NestFactory.createApplicationContext(AppModule, {
    logger: ['error', 'warn'],
  });

  const users = context.get(UsersService);
  const posts = context.get(PostsService, { strict: false });
  const dataSource = context.get(DataSource);

  const rows = await dataSource.query<{ count: number }[]>(
    'select count(*)::int as count from posts',
  );
  const count = rows[0]?.count ?? 0;

  if (count > 0) {
    console.log(`posts already has ${count} rows, nothing to seed`);
    await context.close();
    return;
  }

  const passwordHash = await argon2.hash(PASSWORD);
  const ids = new Map<string, string>();

  for (const person of PEOPLE) {
    const existing = await users.findByNickname(person.nickname);
    const user =
      existing ??
      (await users.create({
        firstName: person.firstName,
        lastName: person.lastName,
        nickname: person.nickname,
        email: person.email,
        passwordHash,
        speciality: person.speciality,
        role: roleForSpeciality(person.speciality),
      }));

    ids.set(person.nickname, user.id);
  }

  const hourInMs = 60 * 60 * 1000;
  let createdAt = Date.now() - POSTS.length * 5 * hourInMs;

  for (const draft of POSTS) {
    const authorId = ids.get(draft.author);
    if (!authorId) throw new Error(`Unknown seed author: ${draft.author}`);

    const post = await posts.create(authorId, {
      direction: draft.direction,
      title: draft.title,
      body: draft.body,
    });

    await dataSource.query(
      'update posts set "createdAt" = $1, "updatedAt" = $1 where id = $2',
      [new Date(createdAt), post.id],
    );

    createdAt += 5 * hourInMs;
  }

  console.log(
    `seeded ${PEOPLE.length} users (password ${PASSWORD}) and ${POSTS.length} posts`,
  );

  await context.close();
};

void seed();
