import { MessageRating } from '@/types/chat';
import { Disclosure, RadioGroup, Transition } from '@headlessui/react';
import { IconWaveSawTool } from '@tabler/icons-react';
import { Tooltip } from 'react-tooltip';

interface Props
{
    rating: MessageRating | undefined;
    onSetRating?: (rating: MessageRating | undefined) => void;
}

const ratings = [
    { id: 1, name: '🤮', value: 'hate' },
    { id: 2, name: '😒', value: 'dislike' },
    { id: 3, name: '😄', value: 'like' },
    { id: 4, name: '😍', value: 'love' },
];

export const ChatMessageRating = ({ rating, onSetRating }: Props) =>
{
    return (
        <Disclosure defaultOpen={rating !== undefined}>
            <Disclosure.Button className="flex justify-end">
                <IconWaveSawTool className="rounded-full text-gray-500 dark:text-gray-400" size={18} />
            </Disclosure.Button>

            <Transition
                enter="transition duration-100 ease-out"
                enterFrom="transform scale-95 opacity-0"
                enterTo="transform scale-100 opacity-100"
                leave="transition duration-75 ease-out"
                leaveFrom="transform scale-100 opacity-100"
                leaveTo="transform scale-95 opacity-0"
            >
                <Disclosure.Panel className="text-base">
                    <RadioGroup value={rating} onChange={
                        (r) => {
                            if (onSetRating)
                            {
                                onSetRating(r);
                            }
                        }
                    }>
                        {/* <RadioGroup.Label className="text-sm flex justify-center">Silk Tuning</RadioGroup.Label> */}
                        <div className="flex justify-center space-x-8">
                            {ratings.map((r) => (
                                <RadioGroup.Option key={r.id} value={r.value}
                                    data-tooltip-id="rating-tooltip"
                                    data-tooltip-content={r.value}
                                    className={
                                        ({ active, checked }) =>
                                            `${active
                                                ? 'ring-1 ring-white/60 ring-offset-1 ring-offset-gray-300'
                                                : ''}
                                            ${checked ? 'bg-gray-500' : 'bg-gray-800'}
                                                relative flex cursor-pointer rounded-full px-1 py-1 shadow-md focus:outline-none`
                                    }
                                >
                                    {r.name}
                                </RadioGroup.Option>
                            ))}
                            <Tooltip id="rating-tooltip" />
                        </div>
                    </RadioGroup>
                </Disclosure.Panel>
            </Transition>
        </Disclosure>
    );
};