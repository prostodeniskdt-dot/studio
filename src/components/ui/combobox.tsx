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
  CommandList,
} from "@/components/ui/command"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"

export type ComboboxOption = {
    value: string;
    label: string;
}

export type GroupedComboboxOption = {
  label: string;
  options: ComboboxOption[];
}

interface ComboboxProps {
    options: GroupedComboboxOption[];
    value?: string;
    onSelect: (value: string) => void;
    placeholder?: string;
    searchPlaceholder?: string;
    notFoundText?: string;
    triggerClassName?: string;
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
    for (const group of options) {
        const found = group.options.find(option => option.value === value);
        if (found) return found.label;
    }
    return placeholder;
  };
  
  const selectedLabel = getSelectedLabel();

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
            {options.map((group) => (
              <CommandGroup key={group.label} heading={group.label}>
                {group.options.map((option) => (
                  <CommandItem
                    key={option.value}
                    value={option.label} // Value for searching
                    onSelect={(currentValue) => { // currentValue is the label
                      // Find the option by label and get its value
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
            ))}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}
