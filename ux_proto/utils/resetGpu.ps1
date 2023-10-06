#Disable the GPU

Get-PnpDevice -FriendlyName "NVIDIA GeForce GTX 1060 6GB" | Disable-PnpDevice -Confirm:$false

#Adjust wait time to any amount you want

Start-Sleep -Seconds 5

#Enable the GPU

Get-PnpDevice -FriendlyName "NVIDIA GeForce GTX 1060 6GB" | Enable-PnpDevice -Confirm:$false