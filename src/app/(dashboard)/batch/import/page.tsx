'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { toast } from 'sonner'
import { ArrowLeft, Upload } from 'lucide-react'
import Link from 'next/link'

import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Combobox } from '@/components/ui/combobox'
import { useEffect } from 'react'

export default function BatchImportPage() {
    const router = useRouter()
    const [batchId, setBatchId] = useState('')
    const [batchTag, setBatchTag] = useState('')
    const [excelData, setExcelData] = useState('')
    const [isImporting, setIsImporting] = useState(false)
    const [batches, setBatches] = useState<any[]>([])
    const [importType, setImportType] = useState('transactions')

    useEffect(() => {
        async function fetchBatches() {
            try {
                const res = await fetch('/api/batches')
                if (res.ok) {
                    const data = await res.json()
                    setBatches(data)
                }
            } catch (error) {
                console.error('Failed to fetch batches', error)
            }
        }
        fetchBatches()
    }, [])

    const handleImport = async () => {
        if (importType === 'transactions' && !batchId) {
            toast.error('Please select a Batch')
            return
        }
        if (!excelData) {
            toast.error('Please upload a file')
            return
        }

        setIsImporting(true)
        try {
            const url = importType === 'transactions'
                ? `/api/batch/${batchId}/import`
                : `/api/bank-mappings/import`

            const response = await fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ excelData, batchTag })
            })

            if (!response.ok) {
                throw new Error('Import failed')
            }

            const result = await response.json()
            toast.success(`Imported ${result.success} items successfully`)

            if (result.errors && result.errors.length > 0) {
                toast.warning(`${result.errors.length} errors occurred`)
                console.error('Import errors:', result.errors)
            }

            if (batchId) {
                router.push(`/batch/${batchId}`)
            } else {
                router.push('/batch')
            }
        } catch (error) {
            console.error(error)
            toast.error('Failed to import items')
        } finally {
            setIsImporting(false)
        }
    }

    return (
        <div className="container max-w-4xl mx-auto py-8 px-4">
            <div className="mb-6">
                <Link href="/batch">
                    <Button variant="ghost" className="mb-4">
                        <ArrowLeft className="h-4 w-4 mr-2" />
                        Back to Batches
                    </Button>
                </Link>
                <h1 className="text-3xl font-bold">Import Batch Items</h1>
                <p className="text-muted-foreground mt-2">
                    Paste data from Excel/Sheets to import batch items or bank mappings
                </p>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Import Configuration</CardTitle>
                    <CardDescription>
                        Select import type and paste your data
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                    <Tabs defaultValue="transactions" onValueChange={(val) => {
                        setImportType(val)
                        setExcelData('')
                    }}>
                        <TabsList className="grid w-full grid-cols-2 mb-6">
                            <TabsTrigger value="transactions">Import Transactions</TabsTrigger>
                            <TabsTrigger value="mappings">Import Bank Mappings</TabsTrigger>
                        </TabsList>

                        <div className="space-y-6">
                            <div className="space-y-2">
                                <Label htmlFor="batchId">Select Batch {importType === 'transactions' ? '*' : '(Optional)'}</Label>
                                <Combobox
                                    items={batches.map(b => ({
                                        value: b.id,
                                        label: b.name,
                                        description: new Date(b.created_at).toLocaleDateString(),
                                        searchValue: b.name
                                    }))}
                                    value={batchId}
                                    onValueChange={(val) => setBatchId(val || '')}
                                    placeholder="Select a batch..."
                                    inputPlaceholder="Search batches..."
                                    emptyState="No batches found"
                                />
                                <p className="text-sm text-muted-foreground">
                                    Select the batch to import items into (or to view mappings)
                                </p>
                            </div>

                            {importType === 'transactions' && (
                                <div className="space-y-2">
                                    <Label htmlFor="batchTag">Batch Tag (Optional)</Label>
                                    <Input
                                        id="batchTag"
                                        placeholder="e.g., 2025-11"
                                        value={batchTag}
                                        onChange={(e) => setBatchTag(e.target.value)}
                                    />
                                    <p className="text-sm text-muted-foreground">
                                        Tag to append to generated notes
                                    </p>
                                </div>
                            )}

                            <div className="space-y-2">
                                <Label htmlFor="data">Paste Data Here *</Label>
                                <Textarea
                                    id="data"
                                    placeholder={importType === 'transactions'
                                        ? `Paste your Excel/Sheet data here...
Example:
1	314 - NH Quốc tế VIB	NH TMCP Quốc tế Việt Nam
2	203 - Vietcombank	VCB - Ngoại Thương (Vietcombank)`
                                        : `Paste your Bank Mappings here...
Example:
1	314 - NH Quốc tế VIB	NH TMCP Quốc tế Việt Nam
2	203 - Vietcombank	VCB - Ngoại Thương (Vietcombank)`
                                    }
                                    value={excelData}
                                    onChange={(e) => setExcelData(e.target.value)}
                                    className="font-mono text-xs min-h-[200px]"
                                />
                                <p className="text-sm text-muted-foreground">
                                    Copy directly from Excel/Google Sheets and paste here.
                                </p>
                            </div>

                            <div className="flex gap-4">
                                <Button
                                    onClick={handleImport}
                                    disabled={isImporting || (importType === 'transactions' && !batchId) || !excelData}
                                    className="flex-1"
                                >
                                    <Upload className="h-4 w-4 mr-2" />
                                    {isImporting ? 'Importing...' : `Import ${importType === 'transactions' ? 'Items' : 'Mappings'}`}
                                </Button>
                                <Button
                                    variant="outline"
                                    onClick={() => router.push('/batch')}
                                >
                                    Cancel
                                </Button>
                            </div>
                        </div>
                    </Tabs>
                </CardContent>
            </Card>

            <Card className="mt-6">
                <CardHeader>
                    <CardTitle>Format Example</CardTitle>
                </CardHeader>
                <CardContent>
                    <pre className="bg-muted p-4 rounded-lg text-xs overflow-x-auto">
                        {`STT\tBank Code - Name\tFull Bank Name
1\t314 - NH Quốc tế VIB\tNH TMCP Quốc tế Việt Nam
2\t203 - Vietcombank\tVCB - Ngoại Thương (Vietcombank)
3\t204 - Agribank\tAGRIBANK - Nông nghiệp & PTNT Việt Nam`}
                    </pre>
                </CardContent>
            </Card>
        </div>
    )
}
