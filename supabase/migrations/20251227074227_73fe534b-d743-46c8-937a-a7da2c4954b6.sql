-- Add DELETE policy for ssl_checks table
CREATE POLICY "Anyone can delete ssl checks"
ON public.ssl_checks
FOR DELETE
USING (true);