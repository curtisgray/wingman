import { stdout } from 'process';
const logger = {
    debug: (message: string) => stdout.write(message),
    info: (message: string) => stdout.write(message),
    warn: (message: string) => stdout.write(message),
    error: (message: string) => stdout.write(message),
    crit: (message: string) => stdout.write(message),
    notice: (message: string) => stdout.write(message),
    level: 'info'
};
export default logger;