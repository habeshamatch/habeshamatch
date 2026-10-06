-- Realtime: stream new messages to chat screens.
-- Row level security still applies, so users only receive messages from their own conversations.
alter publication supabase_realtime add table messages;
