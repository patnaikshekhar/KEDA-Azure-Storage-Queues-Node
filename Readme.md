# KEDA Storage Queue Node.js Example

This is an example of using [KEDA](https://github.com/kedacore/keda) with storage queues.

# Tutorial

We'll start of by cloning this repository and creating a resource group and storage account

```sh
git clone https://github.com/patnaikshekhar/keda-storage-queue-sample
cd keda-storage-queue-sample

RESOURCE_GROUP=KedaSamples
LOCATION=eastus
STORAGE_ACCOUNT_NAME=kedastoragequeuetest

# Login to Azure
az login

# Create a Resource Group
az group create -n $RESOURCE_GROUP -l $LOCATION

# Create a Storage Account
az storage account create \
  -n $STORAGE_ACCOUNT_NAME \
  -g $RESOURCE_GROUP \
  -l $LOCATION \
  --sku Standard_LRS
```

Next we'll get the connection string for the storage account so that we can create a secret

```sh
CONNECTION_STRING=$(az storage account show-connection-string \
  -n $STORAGE_ACCOUNT_NAME \
  -g $RESOURCE_GROUP \
  --query="connectionString" \
  --output=tsv)
```

Now we can create the kubernetes namespace and the secret

```sh
# Create a new namespace
kubectl create namespace keda-storage-queue-sample

# Create a secret with the connection string
kubectl create secret generic keda-storage-queue-sample \
  --namespace=keda-storage-queue-sample \
  --from-literal=STORAGE_ACCOUNT_CONN_STRING=$CONNECTION_STRING
```

We shall now create the queue and deploy the kubernetes objects

```sh
# Deploy the kubernetes objects
kubectl apply -f manifests/

# Create the queue
QUEUE_NAME=keda-test

az storage queue create \
  --name $QUEUE_NAME \
  --account-name $STORAGE_ACCOUNT_NAME
```

We can now open a terminal window to start monitoring the pods. You should see no pods started at this point.

```sh
kubectl get pods -n keda-storage-queue-sample -w
```

Now that the queue is created we're ready to test by placing messages into the queue. Run the following commands to place 20 messages into the queue

```sh
for x in {1..10}
do
az storage message put \
  --content="Test Message ${x}" \
  --queue-name $QUEUE_NAME \
  --account-name=$STORAGE_ACCOUNT_NAME
done
```

You should now see pods automatically spinning up.
