// server 端問卷讀取（用 service_role；僅在 server component / API route 呼叫）。
import 'server-only';
import { supabaseAdmin } from '@/lib/supabase/admin';
import type { SurveyDefinition } from './types';

export interface LoadedSurvey {
  surveyId: string;
  projectSlug: string;
  projectName: string;
  surveySlug: string;
  title: string;
  definition: SurveyDefinition;
  isOpen: boolean;
}

// 取某專案某份問卷（最新版本）的展開快照。
export async function getSurveyForFill(
  projectSlug: string,
  surveySlug: string
): Promise<LoadedSurvey | null> {
  const { data: project } = await supabaseAdmin
    .from('projects')
    .select('id, name, slug')
    .eq('slug', projectSlug)
    .single();
  if (!project) return null;

  const { data: survey } = await supabaseAdmin
    .from('surveys')
    .select('id, slug, title, definition, is_open, opens_at, closes_at, version')
    .eq('project_id', project.id)
    .eq('slug', surveySlug)
    .order('version', { ascending: false })
    .limit(1)
    .single();
  if (!survey) return null;

  const now = Date.now();
  const opensOk = !survey.opens_at || new Date(survey.opens_at).getTime() <= now;
  const closesOk =
    !survey.closes_at || new Date(survey.closes_at).getTime() >= now;
  const isOpen = !!survey.is_open && opensOk && closesOk;

  return {
    surveyId: survey.id,
    projectSlug: project.slug,
    projectName: project.name,
    surveySlug: survey.slug,
    title: survey.title,
    definition: survey.definition as SurveyDefinition,
    isOpen,
  };
}
