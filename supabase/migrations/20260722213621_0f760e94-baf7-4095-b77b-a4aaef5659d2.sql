GRANT UPDATE ON public.raffle_numbers TO authenticated;
CREATE POLICY "Admins can update raffle numbers"
ON public.raffle_numbers
FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));