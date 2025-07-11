/*
      # Add signature_font to profiles table
      1. Modified Tables
        - `profiles`
          - Added `signature_font` (text, default 'Helvetica')
      2. Security
        - No direct RLS changes needed as profiles table already has RLS.
    */
    DO $$
    BEGIN
      IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'profiles' AND column_name = 'signature_font'
      ) THEN
        ALTER TABLE profiles ADD COLUMN signature_font text DEFAULT 'Helvetica';
      END IF;
    END $$;