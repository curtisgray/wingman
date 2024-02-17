import { FC } from "react";
import { SettingInput } from "./SettingInput";

interface Props {
    value: string;
    onChange: (value: string) => void;
}

export const HostAddress: FC<Props> = ({ value, onChange = () => {} }) => {
    return (
        <SettingInput value={value} onChange={onChange} labelText="Host Address" hideInput={false} />
    );
};
