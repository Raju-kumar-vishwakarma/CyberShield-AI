-- Create table for AI detection scan history
CREATE TABLE public.ai_detection_scans (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  file_name TEXT NOT NULL,
  media_type TEXT NOT NULL DEFAULT 'image',
  is_ai_generated BOOLEAN NOT NULL DEFAULT false,
  confidence INTEGER NOT NULL DEFAULT 0,
  risk_level TEXT NOT NULL DEFAULT 'uncertain',
  ai_score INTEGER NOT NULL DEFAULT 0,
  authentic_score INTEGER NOT NULL DEFAULT 0,
  analysis TEXT,
  strict_mode BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.ai_detection_scans ENABLE ROW LEVEL SECURITY;

-- Users can view their own scans
CREATE POLICY "Users can view their own scans"
ON public.ai_detection_scans
FOR SELECT
USING (auth.uid() = user_id);

-- Users can insert their own scans
CREATE POLICY "Users can insert their own scans"
ON public.ai_detection_scans
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Users can delete their own scans
CREATE POLICY "Users can delete their own scans"
ON public.ai_detection_scans
FOR DELETE
USING (auth.uid() = user_id);

-- Add index for faster queries
CREATE INDEX idx_ai_detection_scans_user_id ON public.ai_detection_scans(user_id);
CREATE INDEX idx_ai_detection_scans_created_at ON public.ai_detection_scans(created_at DESC);