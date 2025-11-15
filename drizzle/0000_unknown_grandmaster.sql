CREATE TABLE "achievements" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"description" text NOT NULL,
	"icon" text,
	"requirement_type" text NOT NULL,
	"requirement_value" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now(),
	CONSTRAINT "achievements_name_unique" UNIQUE("name")
);
--> statement-breakpoint
CREATE TABLE "chat_messages" (
	"id" text PRIMARY KEY NOT NULL,
	"lobby_id" text NOT NULL,
	"sender_id" text NOT NULL,
	"message" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "friendships" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"friend_id" text NOT NULL,
	"status" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now(),
	CONSTRAINT "friendships_user_id_friend_id_unique" UNIQUE("user_id","friend_id")
);
--> statement-breakpoint
CREATE TABLE "game_emojis" (
	"id" text PRIMARY KEY NOT NULL,
	"session_id" text NOT NULL,
	"player_id" text NOT NULL,
	"emoji_type" text NOT NULL,
	"position_x" real NOT NULL,
	"position_y" real NOT NULL,
	"created_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "game_lobbies" (
	"id" text PRIMARY KEY NOT NULL,
	"host_id" text NOT NULL,
	"name" text NOT NULL,
	"game_type" text DEFAULT 'durak' NOT NULL,
	"max_players" integer DEFAULT 4 NOT NULL,
	"current_players" integer DEFAULT 1 NOT NULL,
	"bet_amount" integer DEFAULT 10 NOT NULL,
	"deck_size" integer DEFAULT 36 NOT NULL,
	"is_throw_in" boolean DEFAULT true,
	"is_private" boolean DEFAULT false,
	"password" text,
	"status" text DEFAULT 'waiting' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "game_sessions" (
	"id" text PRIMARY KEY NOT NULL,
	"lobby_id" text NOT NULL,
	"current_turn_player_id" text,
	"game_state" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"trump_suit" text,
	"status" text DEFAULT 'active' NOT NULL,
	"winner_id" text,
	"created_at" timestamp with time zone DEFAULT now(),
	"finished_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "lobby_players" (
	"id" text PRIMARY KEY NOT NULL,
	"lobby_id" text NOT NULL,
	"player_id" text NOT NULL,
	"position" integer NOT NULL,
	"joined_at" timestamp with time zone DEFAULT now(),
	CONSTRAINT "lobby_players_lobby_id_player_id_unique" UNIQUE("lobby_id","player_id")
);
--> statement-breakpoint
CREATE TABLE "profiles" (
	"id" text PRIMARY KEY NOT NULL,
	"username" text NOT NULL,
	"avatar_url" text,
	"level" integer DEFAULT 1,
	"total_wins" integer DEFAULT 0,
	"total_games" integer DEFAULT 0,
	"diamonds_won" integer DEFAULT 0,
	"diamonds_balance" integer DEFAULT 100,
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now(),
	CONSTRAINT "profiles_username_unique" UNIQUE("username")
);
--> statement-breakpoint
CREATE TABLE "user_achievements" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"achievement_id" text NOT NULL,
	"unlocked_at" timestamp with time zone DEFAULT now(),
	CONSTRAINT "user_achievements_user_id_achievement_id_unique" UNIQUE("user_id","achievement_id")
);
--> statement-breakpoint
CREATE TABLE "user_auth" (
	"user_id" text PRIMARY KEY NOT NULL,
	"password_hash" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
ALTER TABLE "chat_messages" ADD CONSTRAINT "chat_messages_lobby_id_game_lobbies_id_fk" FOREIGN KEY ("lobby_id") REFERENCES "public"."game_lobbies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "chat_messages" ADD CONSTRAINT "chat_messages_sender_id_profiles_id_fk" FOREIGN KEY ("sender_id") REFERENCES "public"."profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "friendships" ADD CONSTRAINT "friendships_user_id_profiles_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "friendships" ADD CONSTRAINT "friendships_friend_id_profiles_id_fk" FOREIGN KEY ("friend_id") REFERENCES "public"."profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "game_emojis" ADD CONSTRAINT "game_emojis_session_id_game_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."game_sessions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "game_emojis" ADD CONSTRAINT "game_emojis_player_id_profiles_id_fk" FOREIGN KEY ("player_id") REFERENCES "public"."profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "game_lobbies" ADD CONSTRAINT "game_lobbies_host_id_profiles_id_fk" FOREIGN KEY ("host_id") REFERENCES "public"."profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "game_sessions" ADD CONSTRAINT "game_sessions_lobby_id_game_lobbies_id_fk" FOREIGN KEY ("lobby_id") REFERENCES "public"."game_lobbies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "game_sessions" ADD CONSTRAINT "game_sessions_current_turn_player_id_profiles_id_fk" FOREIGN KEY ("current_turn_player_id") REFERENCES "public"."profiles"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "game_sessions" ADD CONSTRAINT "game_sessions_winner_id_profiles_id_fk" FOREIGN KEY ("winner_id") REFERENCES "public"."profiles"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lobby_players" ADD CONSTRAINT "lobby_players_lobby_id_game_lobbies_id_fk" FOREIGN KEY ("lobby_id") REFERENCES "public"."game_lobbies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lobby_players" ADD CONSTRAINT "lobby_players_player_id_profiles_id_fk" FOREIGN KEY ("player_id") REFERENCES "public"."profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_achievements" ADD CONSTRAINT "user_achievements_user_id_profiles_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_achievements" ADD CONSTRAINT "user_achievements_achievement_id_achievements_id_fk" FOREIGN KEY ("achievement_id") REFERENCES "public"."achievements"("id") ON DELETE cascade ON UPDATE no action;