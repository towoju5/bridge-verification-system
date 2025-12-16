import React from "react";
import Select, { MultiValue } from "react-select";
import makeAnimated from "react-select/animated";

export interface SelectOption {
    value: string;
    label: string;
}

interface AnimatedMultiProps {
    selectOptions: SelectOption[];
    value: SelectOption[];
    onChange: (values: SelectOption[]) => void;
    placeholder?: string;
    isDisabled?: boolean;
}

const animatedComponents = makeAnimated();

export default function AnimatedMulti({
    selectOptions,
    value,
    onChange,
    placeholder = "Select...",
    isDisabled = false,
}: AnimatedMultiProps) {
    return (
        <Select
            isMulti
            closeMenuOnSelect={false}
            components={animatedComponents}
            options={selectOptions}
            value={value}
            onChange={(selected: MultiValue<SelectOption>) =>
                onChange(selected as SelectOption[])
            }
            placeholder={placeholder}
            isDisabled={isDisabled}
            classNamePrefix="react-select"
            styles={{
                control: (base) => ({
                    ...base,
                    minHeight: "42px",
                }),
            }}
        />
    );
}
