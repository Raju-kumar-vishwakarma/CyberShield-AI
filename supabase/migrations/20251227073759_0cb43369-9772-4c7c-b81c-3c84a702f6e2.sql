-- Add DELETE policy for email_breach_checks table
CREATE POLICY "Anyone can delete breach checks"
ON public.email_breach_checks
FOR DELETE
USING (true);