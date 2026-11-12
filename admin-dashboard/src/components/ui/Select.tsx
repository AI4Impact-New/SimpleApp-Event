'use client';
// Drop-in replacement for a native <select>, rendered with react-select.
// Keeps the native API — <option> children, value/defaultValue, name (for FormData),
// required, disabled — and calls onChange with an event-like object, so callers
// written as `onChange={e => set(e.target.value)}` keep working unchanged.
import { Children, Fragment, ReactNode, isValidElement, useId, useMemo, useRef, useState, type ChangeEvent, type ReactElement, type SelectHTMLAttributes } from 'react';
import ReactSelect, { components, type OptionProps, type SingleValue } from 'react-select';

export interface SelectOption { value: string; label: string; isDisabled?: boolean }

type Props = Omit<SelectHTMLAttributes<HTMLSelectElement>, 'value' | 'defaultValue' | 'onChange' | 'children'> & {
  value?: string | number | readonly string[];
  defaultValue?: string | number | readonly string[];
  onChange?: (event: ChangeEvent<HTMLSelectElement>) => void;
  children?: ReactNode;
  options?: SelectOption[];
  placeholder?: string;
};

const textOf = (node: ReactNode): string => {
  if (node == null || typeof node === 'boolean') return '';
  if (typeof node === 'string' || typeof node === 'number') return String(node);
  if (Array.isArray(node)) return node.map(textOf).join('');
  if (isValidElement<{ children?: ReactNode }>(node)) return textOf(node.props.children);
  return '';
};

function optionsFrom(children: ReactNode): SelectOption[] {
  const result: SelectOption[] = [];
  Children.forEach(children, child => {
    if (!isValidElement(child)) return;
    const element = child as ReactElement<{ value?: string | number; disabled?: boolean; children?: ReactNode }>;
    if (element.type === Fragment) { result.push(...optionsFrom(element.props.children)); return; }
    if (element.type !== 'option') return;
    const label = textOf(element.props.children);
    result.push({ value: element.props.value !== undefined ? String(element.props.value) : label, label, isDisabled: !!element.props.disabled });
  });
  return result;
}

// Only layout utilities from the old <Select> className are kept; visual styling comes from react-select below.
const LAYOUT = /^(?:[a-z]+:)?(?:m[trblxy]?-|-m[trblxy]?-|w-|min-w-|max-w-|flex-|grow|shrink|basis-|self-|col-|row-|order-|hidden$|block$|inline-block$)/;

function Option(props: OptionProps<SelectOption, false>) {
  return <components.Option {...props} innerProps={{ ...props.innerProps, 'data-value': props.data.value } as typeof props.innerProps} />;
}

export function Select({ value, defaultValue, onChange, children, options: given, className = '', name, required, disabled, id, placeholder, title, ...rest }: Props) {
  const instanceId = useId();
  const wrapper = useRef<HTMLDivElement>(null);
  // Menus portal out of overflow containers; inside a modal <dialog> (browser top layer) they must stay in the dialog.
  const [portal, setPortal] = useState<HTMLElement | null>(null);
  const options = useMemo(() => given ?? optionsFrom(children), [given, children]);
  const controlled = value !== undefined;
  const [internal, setInternal] = useState(() => defaultValue !== undefined ? String(defaultValue) : options.find(o => !o.isDisabled)?.value ?? '');
  const current = controlled ? String(value) : internal;
  const selected = current === '' ? null : options.find(o => o.value === current) ?? null;
  const emptyLabel = options.find(o => o.value === '')?.label;
  const compact = /\b(py-1|py-1\.5|text-xs)\b/.test(className);
  const layout = className.split(/\s+/).filter(c => LAYOUT.test(c)).join(' ');

  const change = (option: SingleValue<SelectOption>) => {
    const next = option?.value ?? '';
    if (!controlled) setInternal(next);
    const target = { value: next, name: name ?? '' } as HTMLSelectElement;
    onChange?.({ target, currentTarget: target } as ChangeEvent<HTMLSelectElement>);
  };

  return <div ref={wrapper} className={`${layout} ${/\bw-/.test(layout) ? '' : 'min-w-[9rem]'}`} title={title} data-name={name}>
    <ReactSelect<SelectOption, false>
      instanceId={instanceId}
      classNamePrefix="rs"
      inputId={id}
      aria-label={rest['aria-label']}
      aria-labelledby={rest['aria-labelledby']}
      name={name}
      required={required}
      isDisabled={disabled}
      options={required ? options.filter(o => o.value !== '') : options}
      value={selected}
      onChange={change}
      placeholder={placeholder ?? emptyLabel ?? 'Select…'}
      isSearchable={options.length > 8}
      isOptionDisabled={o => !!o.isDisabled}
      components={{ Option }}
      menuPortalTarget={portal}
      onMenuOpen={() => setPortal(wrapper.current?.closest('dialog') ?? document.body)}
      menuPosition="fixed"
      menuPlacement="auto"
      unstyled
      classNames={{
        control: ({ isFocused, isDisabled }) => `rounded-lg border bg-white text-sm transition ${compact ? 'min-h-[32px] px-2' : 'min-h-[38px] px-3'} ${isFocused ? 'border-primary-500 ring-2 ring-primary-100' : 'border-gray-300 hover:border-gray-400'} ${isDisabled ? 'cursor-not-allowed bg-gray-50 opacity-60' : 'cursor-pointer'}`,
        valueContainer: () => 'gap-1 py-0.5',
        singleValue: ({ data }) => data.value === '' ? 'text-gray-500' : 'text-gray-900',
        placeholder: () => 'text-gray-400',
        input: () => 'text-gray-900',
        indicatorSeparator: () => 'hidden',
        dropdownIndicator: ({ isFocused }) => `pl-2 ${isFocused ? 'text-primary-600' : 'text-gray-400'}`,
        menuPortal: () => '!z-[70]',
        menu: () => 'mt-1 overflow-hidden rounded-lg border border-gray-200 bg-white text-sm shadow-lg',
        menuList: () => 'max-h-64 py-1',
        option: ({ isFocused, isSelected, isDisabled }) => `px-3 py-2 ${isDisabled ? 'cursor-not-allowed text-gray-300' : 'cursor-pointer'} ${isSelected ? 'bg-primary-50 font-medium text-primary-700' : isFocused ? 'bg-gray-100 text-gray-900' : 'text-gray-700'}`,
        noOptionsMessage: () => 'px-3 py-2 text-gray-500',
      }}
    />
  </div>;
}

export default Select;
