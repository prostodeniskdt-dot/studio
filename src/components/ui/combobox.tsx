"use client"

import * as React from "react"
import { Check, ChevronsUpDown } from "lucide-react"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList
} from "@/components/ui/command"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"

export type ComboboxOption = {
    value: string;
    label: string;
    category?: string; // Optional category for grouping
}

export type GroupedComboboxOption = {
  label: string;
  options: ComboboxOption[];
}

interface ComboboxProps {
    options: ComboboxOption[] | GroupedComboboxOption[];
    value?: string;
    onSelect: (value: string) => void;
    placeholder?: string;
    searchPlaceholder?: string;
    notFoundText?: string;
    triggerClassName?: string;
}

const isGrouped = (options: any[]): options is GroupedComboboxOption[] => {
  return options.length > 0 && 'options' in options[0] && 'label' in options[0];
}


export function Combobox({ 
    options,
    value,
    onSelect,
    placeholder = "Выберите...",
    searchPlaceholder = "Поиск...",
    notFoundText = "Не найдено.",
    triggerClassName
}: ComboboxProps) {
  const [open, setOpen] = React.useState(false)

  const getSelectedLabel = () => {
    if (!value) return placeholder;
    if (isGrouped(options)) {
        for (const group of options) {
            const found = group.options.find(option => option.value === value);
            if (found) return found.label;
        }
    } else {
        const found = (options as ComboboxOption[]).find(option => option.value === value);
        if (found) return found.label;
    }
    return placeholder;
  };
  
  const selectedLabel = getSelectedLabel();

  const renderOptions = () => {
    if (isGrouped(options)) {
      return options.map((group) => (
        <CommandGroup key={group.label} heading={group.label}>
          {group.options.map((option) => (
            <CommandItem
              key={option.value}
              value={option.label}
              onSelect={() => {
                onSelect(option.value === value ? "" : option.value)
                setOpen(false)
              }}
            >
              <Check
                className={cn(
                  "mr-2 h-4 w-4",
                  value === option.value ? "opacity-100" : "opacity-0"
                )}
              />
              {option.label}
            </CommandItem>
          ))}
        </CommandGroup>
      ));
    }

    return (
      <CommandGroup>
        {(options as ComboboxOption[]).map((option) => (
          <CommandItem
            key={option.value}
            value={option.label}
            onSelect={() => {
              onSelect(option.value === value ? "" : option.value)
              setOpen(false)
            }}
          >
            <Check
              className={cn(
                "mr-2 h-4 w-4",
                value === option.value ? "opacity-100" : "opacity-0"
              )}
            />
            {option.label}
          </CommandItem>
        ))}
      </CommandGroup>
    );
  };


  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={cn("w-full justify-between", triggerClassName)}
        >
          <span className="truncate">
            {selectedLabel}
          </span>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
        <Command>
          <CommandInput placeholder={searchPlaceholder} />
          <CommandList>
            <CommandEmpty>{notFoundText}</CommandEmpty>
            {renderOptions()}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}
