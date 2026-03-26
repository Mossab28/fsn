'use client'

import * as RadixSelect from '@radix-ui/react-select'
import { Check, ChevronDown, ChevronUp } from 'lucide-react'
import React from 'react'

interface SelectOption {
  value: string
  label: string
  disabled?: boolean
}

interface SelectGroup {
  label: string
  options: SelectOption[]
}

interface SelectProps {
  value?: string
  onValueChange?: (value: string) => void
  placeholder?: string
  label?: string
  error?: string
  disabled?: boolean
  options?: SelectOption[]
  groups?: SelectGroup[]
  name?: string
}

export function Select({
  value,
  onValueChange,
  placeholder = 'Sélectionner...',
  label,
  error,
  disabled,
  options,
  groups,
  name,
}: SelectProps) {
  const inputId = label ? label.toLowerCase().replace(/\s+/g, '-') : undefined

  const labelStyle: React.CSSProperties = {
    fontFamily: 'var(--font-body)',
    fontSize: '12px',
    fontWeight: 600,
    letterSpacing: '0.04em',
    textTransform: 'uppercase',
    color: error ? 'var(--red)' : 'var(--text-secondary)',
    display: 'block',
    marginBottom: '4px',
  }

  const triggerStyle: React.CSSProperties = {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    padding: '9px 12px',
    background: 'var(--bg-raised)',
    border: error ? '1px solid var(--red)' : '1px solid var(--border)',
    borderRadius: 'var(--radius-md)',
    color: 'var(--text-primary)',
    fontFamily: 'var(--font-body)',
    fontSize: '14px',
    cursor: disabled ? 'not-allowed' : 'pointer',
    opacity: disabled ? 0.5 : 1,
    transition: 'border-color var(--transition), box-shadow var(--transition)',
    outline: 'none',
    gap: '8px',
    boxShadow: error ? '0 0 0 3px var(--red-dim)' : 'none',
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', width: '100%' }}>
      {label && (
        <label htmlFor={inputId} style={labelStyle}>
          {label}
        </label>
      )}

      <RadixSelect.Root value={value} onValueChange={onValueChange} disabled={disabled} name={name}>
        <RadixSelect.Trigger
          id={inputId}
          style={triggerStyle}
          onMouseEnter={(e) => {
            if (!disabled) {
              const el = e.currentTarget as HTMLButtonElement
              el.style.borderColor = error ? 'var(--red)' : 'var(--accent)'
              el.style.boxShadow = error ? '0 0 0 3px var(--red-dim)' : '0 0 0 3px var(--accent-dim)'
            }
          }}
          onMouseLeave={(e) => {
            if (!disabled) {
              const el = e.currentTarget as HTMLButtonElement
              el.style.borderColor = error ? 'var(--red)' : 'var(--border)'
              el.style.boxShadow = error ? '0 0 0 3px var(--red-dim)' : 'none'
            }
          }}
          aria-label={label}
        >
          <RadixSelect.Value
            placeholder={
              <span style={{ color: 'var(--text-tertiary)' }}>{placeholder}</span>
            }
          />
          <RadixSelect.Icon style={{ color: 'var(--text-tertiary)', flexShrink: 0 }}>
            <ChevronDown size={14} />
          </RadixSelect.Icon>
        </RadixSelect.Trigger>

        <RadixSelect.Portal>
          <RadixSelect.Content
            style={{
              background: 'var(--bg-overlay)',
              border: '1px solid var(--border)',
              borderRadius: 'var(--radius-md)',
              boxShadow: 'var(--shadow-md)',
              overflow: 'hidden',
              zIndex: 100,
              minWidth: 'var(--radix-select-trigger-width)',
            }}
            position="popper"
            sideOffset={4}
          >
            <RadixSelect.ScrollUpButton
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                height: '24px',
                color: 'var(--text-tertiary)',
                cursor: 'default',
              }}
            >
              <ChevronUp size={12} />
            </RadixSelect.ScrollUpButton>

            <RadixSelect.Viewport style={{ padding: '4px' }}>
              {groups
                ? groups.map((group) => (
                    <RadixSelect.Group key={group.label}>
                      <RadixSelect.Label
                        style={{
                          padding: '6px 8px 4px',
                          fontSize: '11px',
                          fontWeight: 600,
                          letterSpacing: '0.06em',
                          textTransform: 'uppercase',
                          color: 'var(--text-tertiary)',
                          fontFamily: 'var(--font-body)',
                        }}
                      >
                        {group.label}
                      </RadixSelect.Label>
                      {group.options.map((opt) => (
                        <SelectItem key={opt.value} option={opt} />
                      ))}
                    </RadixSelect.Group>
                  ))
                : options?.map((opt) => <SelectItem key={opt.value} option={opt} />)}
            </RadixSelect.Viewport>

            <RadixSelect.ScrollDownButton
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                height: '24px',
                color: 'var(--text-tertiary)',
                cursor: 'default',
              }}
            >
              <ChevronDown size={12} />
            </RadixSelect.ScrollDownButton>
          </RadixSelect.Content>
        </RadixSelect.Portal>
      </RadixSelect.Root>

      {error && (
        <span
          style={{
            fontFamily: 'var(--font-body)',
            fontSize: '12px',
            color: 'var(--red)',
            marginTop: '4px',
          }}
        >
          {error}
        </span>
      )}
    </div>
  )
}

function SelectItem({ option }: { option: SelectOption }) {
  return (
    <RadixSelect.Item
      value={option.value}
      disabled={option.disabled}
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '7px 8px',
        borderRadius: 'var(--radius-sm)',
        fontSize: '13px',
        fontFamily: 'var(--font-body)',
        color: option.disabled ? 'var(--text-tertiary)' : 'var(--text-primary)',
        cursor: option.disabled ? 'not-allowed' : 'pointer',
        outline: 'none',
        userSelect: 'none',
        transition: 'background var(--transition)',
        gap: '8px',
      }}
      onMouseEnter={(e) => {
        if (!option.disabled) {
          (e.currentTarget as HTMLDivElement).style.background = 'var(--bg-raised)'
        }
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLDivElement).style.background = 'transparent'
      }}
    >
      <RadixSelect.ItemText>{option.label}</RadixSelect.ItemText>
      <RadixSelect.ItemIndicator style={{ color: 'var(--accent)', flexShrink: 0 }}>
        <Check size={12} />
      </RadixSelect.ItemIndicator>
    </RadixSelect.Item>
  )
}
