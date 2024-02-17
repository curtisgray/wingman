import { IconX } from "@tabler/icons-react";
import { useTranslation } from "next-i18next";
import { FC } from "react";

interface Props {
    placeholder: string;
    searchTerm: string;
    onSearch: (searchTerm: string) => void;
}
const Search: FC<Props> = ({ placeholder, searchTerm, onSearch }) => {
    const { t } = useTranslation("sidebar");

    const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        onSearch(e.target.value);
    };

    const clearSearch = () => {
        onSearch("");
    };

    return (
        <div className="relative flex items-center">
            <input
                className="w-full flex-1 rounded-md text-inherit bg-inherit border border-gray-600 px-4 py-3 pr-10 text-sm leading-3"
                type="text"
                placeholder={t(placeholder) || ""}
                value={searchTerm}
                onChange={handleSearchChange}
            />

            {searchTerm && (
                <IconX
                    className="absolute right-4 cursor-pointer text-gray-300 hover:text-gray-400"
                    size={18}
                    onClick={clearSearch}
                />
            )}
        </div>
    );
};

export default Search;
