export const disabledLlm = {
    async complete() {
        throw new Error('LLM adapter is disabled (maintenanceMode: off)');
    },
};
export function isBudgetError(error) {
    return error?.code === 'MONEY_BUDGET_EXCEEDED';
}
