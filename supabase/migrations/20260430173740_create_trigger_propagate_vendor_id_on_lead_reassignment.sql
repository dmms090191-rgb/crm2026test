/*
  # Create trigger to propagate vendor_id on lead reassignment

  1. Changes
    - Creates a function `propagate_lead_vendor_id_to_client_messages()`
    - Creates a trigger on `leads` table that fires AFTER UPDATE when vendor_id changes
    - Updates all `client_messages.vendor_id` for the reassigned lead's messages

  2. Behavior
    - When leads.vendor_id changes (including from/to NULL):
      - Finds the client_auth_id from lead data (data->>'AuthId', data->>'auth_id', or lead.id)
      - Updates ALL client_messages for that client_auth_id to the new vendor_id
    - This ensures the full conversation history follows the lead to the new responsible party

  3. Important Notes
    - Covers all reassignment cases: admin->vendor, vendor->admin, vendorA->vendorB
    - Does NOT delete or duplicate any messages
    - Preserves full conversation history
*/

CREATE OR REPLACE FUNCTION propagate_lead_vendor_id_to_client_messages()
RETURNS TRIGGER AS $$
DECLARE
  _client_auth_id uuid;
BEGIN
  IF (OLD.vendor_id IS DISTINCT FROM NEW.vendor_id) THEN
    _client_auth_id := COALESCE(
      (NEW.data->>'AuthId')::uuid,
      (NEW.data->>'auth_id')::uuid,
      NEW.id
    );

    UPDATE client_messages
    SET vendor_id = NEW.vendor_id
    WHERE client_auth_id = _client_auth_id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'trg_propagate_lead_vendor_id'
  ) THEN
    CREATE TRIGGER trg_propagate_lead_vendor_id
      AFTER UPDATE ON leads
      FOR EACH ROW
      EXECUTE FUNCTION propagate_lead_vendor_id_to_client_messages();
  END IF;
END $$;
