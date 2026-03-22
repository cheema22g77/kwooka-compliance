-- Compliance Analyses table (stores AI analysis results)
CREATE TABLE IF NOT EXISTS public.compliance_analyses (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  document_id UUID REFERENCES public.documents(id) ON DELETE SET NULL,
  sector TEXT NOT NULL,
  document_type TEXT,
  document_name TEXT,
  overall_score INTEGER CHECK (overall_score >= 0 AND overall_score <= 100),
  overall_status TEXT,
  risk_level TEXT,
  summary TEXT,
  findings JSONB DEFAULT '[]',
  strengths JSONB DEFAULT '[]',
  critical_gaps JSONB DEFAULT '[]',
  action_plan JSONB DEFAULT '[]',
  compliance_by_area JSONB DEFAULT '[]',
  raw_analysis JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.compliance_analyses ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their own analyses"
  ON public.compliance_analyses FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own analyses"
  ON public.compliance_analyses FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own analyses"
  ON public.compliance_analyses FOR DELETE
  USING (auth.uid() = user_id);

-- Trigger for updated_at
CREATE TRIGGER compliance_analyses_updated_at
  BEFORE UPDATE ON public.compliance_analyses
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- Indexes
CREATE INDEX idx_compliance_analyses_user_id ON public.compliance_analyses(user_id);
CREATE INDEX idx_compliance_analyses_sector ON public.compliance_analyses(sector);
CREATE INDEX idx_compliance_analyses_created_at ON public.compliance_analyses(created_at);
