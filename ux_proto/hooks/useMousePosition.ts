import React from 'react';

const useMousePosition = () =>
{
    const [mousePosition, setMousePosition] = React.useState<MouseEvent>();
    React.useEffect(() =>
    {
        const updateMousePosition = (ev: MouseEvent) =>
        {
            setMousePosition(ev);
        };
        window.addEventListener('mousemove', updateMousePosition);
        return () =>
        {
            window.removeEventListener('mousemove', updateMousePosition);
        };
    }, []);
    return mousePosition;
};
export default useMousePosition;