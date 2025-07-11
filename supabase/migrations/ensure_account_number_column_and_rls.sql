/*
      # Ensure bank_info.account_number column is correctly configured and RLS is active
      1. Changes
        - `bank_info`
          - Ensure `account_number` column exists as `text`.
          - Update any existing `NULL` `account_number` values to `''`.
          - Set `account_number` to `NOT NULL` with `DEFAULT ''`.
      2. Security
        - Re-confirm RLS on `bank_info` table.
        - Re-confirm RLS policies for authenticated users to manage their own bank information.
    */

    -- Add account_number column if it doesn't exist (initially nullable)
    DO $$
    BEGIN
      IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'bank_info' AND column_name = 'account_number'
      ) THEN
        ALTER TABLE bank_info ADD COLUMN account_number text;
      END IF;
    END $$;

    -- Update any existing NULL account_number values to empty string to allow NOT NULL constraint
    UPDATE bank_info SET account_number = '' WHERE account_number IS NULL;

    -- Ensure account_number column is NOT NULL and has a default value
    ALTER TABLE bank_info ALTER COLUMN account_number SET DEFAULT '';
    ALTER TABLE bank_info ALTER COLUMN account_number SET NOT NULL;

    -- Enable Row Level Security (RLS) - idempotent, ensures RLS is on
    ALTER TABLE bank_info ENABLE ROW LEVEL SECURITY;

    -- Re-create RLS policies to ensure they are correct and active
    -- Drop existing policies to prevent conflicts
    DROP POLICY IF EXISTS "Users can select their own bank info." ON bank_info;
    DROP POLICY IF EXISTS "Users can insert their own bank info." ON bank_info;
    DROP POLICY IF EXISTS "Users can update their own bank info." ON bank_info;
    DROP POLICY IF EXISTS "Users can delete their own bank info." ON bank_info;

    -- RLS Policy for SELECT: Users can read their own bank info
    CREATE POLICY "Users can select their own bank info."
      ON bank_info FOR SELECT
      TO authenticated
      USING (auth.uid() = user_id);

    -- RLS Policy for INSERT: Users can create their own bank info
    CREATE POLICY "Users can insert their own bank info."
      ON bank_info FOR INSERT
      TO authenticated
      WITH CHECK (auth.uid() = user_id);

    -- RLS Policy for UPDATE: Users can update their own bank info.
    CREATE POLICY "Users can update their own bank info."
      ON bank_info FOR UPDATE
      TO authenticated
      USING (auth.uid() = user_id);

    -- RLS Policy for DELETE: Users can delete their own bank info.
    CREATE POLICY "Users can delete their own bank info."
      ON bank_info FOR DELETE
      TO authenticated
      USING (auth.uid() = user_id);