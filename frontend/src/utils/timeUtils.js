export const getAppTimeOffset = () => {
    return Number(localStorage.getItem('appTimeOffset')) || 0;
};

export const setAppTimeOffset = (manualDateInput) => {
    if (!manualDateInput) return;
    const targetTime = new Date(manualDateInput).getTime();
    if (isNaN(targetTime)) return;
    
    const offset = targetTime - Date.now();
    localStorage.setItem('appTimeOffset', offset.toString());
};

export const resetAppTimeOffset = () => {
    localStorage.removeItem('appTimeOffset');
};

export const getAppTime = () => {
    return new Date(Date.now() + getAppTimeOffset());
};
