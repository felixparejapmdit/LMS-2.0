async function testAllFilters() {
    const filters = ['review', 'signature', 'vem', 'pending', 'hold'];
    for (const f of filters) {
        try {
            const url = `http://localhost:5000/api/letter-assignments?status=Pending&exclude_vip=true&named_filter=${f}&department_id=3`;
            const res = await fetch(url);
            const data = await res.json();
            console.log(`Filter [${f}] returned ${data.length} items with dept=3`);
        } catch (e) {
            console.error(`Filter [${f}] failed: `, e.message);
        }
    }
}

testAllFilters();
