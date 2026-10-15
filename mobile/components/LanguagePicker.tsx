import { MultiSelectSheet, type SelectSection } from '@/components/MultiSelectSheet';
import { LANGUAGE_GROUPS, MAX_LANGUAGES } from '@/lib/languages';

type Props = {
  visible: boolean;
  selected: string[];
  onChange: (codes: string[]) => void;
  onClose: () => void;
  title?: string;
};

const SECTIONS: SelectSection[] = LANGUAGE_GROUPS.map((g) => ({
  title: g.title,
  items: g.languages.map((l) => ({ value: l.code, label: l.name })),
}));

// Searchable multi-select of every language, grouped by region.
export function LanguagePicker({ visible, selected, onChange, onClose, title = 'Languages you speak' }: Props) {
  return (
    <MultiSelectSheet
      visible={visible}
      title={title}
      searchPlaceholder="Search languages"
      sections={SECTIONS}
      selected={selected}
      onChange={onChange}
      onClose={onClose}
      max={MAX_LANGUAGES}
    />
  );
}
