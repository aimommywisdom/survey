'use client';

import type { Question } from '@/lib/survey/types';
import type { AnswerValue } from '@/lib/survey/answers';
import { SingleField } from './fields/SingleField';
import { MultiField } from './fields/MultiField';
import { ScaleField } from './fields/ScaleField';
import { TextField } from './fields/TextField';
import { NumberField } from './fields/NumberField';
import { BehaviorCheckField } from './fields/BehaviorCheckField';
import { PainRepeaterField } from './fields/PainRepeaterField';
import { AvailabilityField } from './fields/AvailabilityField';

// 依 question.type 分派到對應題型元件。
// 新增題型 = 在此加一個 case + 一個 fields/ 元件，不動其他地方。
export function QuestionField({
  question,
  value,
  onChange,
  error,
}: {
  question: Question;
  value?: AnswerValue;
  onChange: (v: AnswerValue) => void;
  error?: string;
}) {
  switch (question.type) {
    case 'single':
      return (
        <SingleField
          question={question}
          value={value as never}
          onChange={onChange}
          error={error}
        />
      );
    case 'multi':
      return (
        <MultiField
          question={question}
          value={value as never}
          onChange={onChange}
          error={error}
        />
      );
    case 'scale':
      return (
        <ScaleField
          question={question}
          value={value as never}
          onChange={onChange}
          error={error}
        />
      );
    case 'short_text':
    case 'long_text':
      return (
        <TextField
          question={question}
          value={value as never}
          onChange={onChange}
          error={error}
        />
      );
    case 'number':
      return (
        <NumberField
          question={question}
          value={value as never}
          onChange={onChange}
          error={error}
        />
      );
    case 'behavior_check':
      return (
        <BehaviorCheckField
          question={question}
          value={value as never}
          onChange={onChange}
          error={error}
        />
      );
    case 'pain_repeater':
      return (
        <PainRepeaterField
          question={question}
          value={value as never}
          onChange={onChange}
          error={error}
        />
      );
    case 'availability':
      return (
        <AvailabilityField
          question={question}
          value={value as never}
          onChange={onChange}
          error={error}
        />
      );
    default: {
      question satisfies never;
      return null;
    }
  }
}
