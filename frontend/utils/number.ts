
export const FormatPercentage = (value: number): string => {
    if (isNaN(value)) return "0%";
    return `${(value / 10).toFixed(2)}%`;
}